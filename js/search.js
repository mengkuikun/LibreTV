async function searchByAPIAndKeyWord(apiId, query) {
    try {
        let apiUrl, apiName, apiBaseUrl;
        
        // 处理自定义API
        if (apiId.startsWith('custom_')) {
            const customIndex = apiId.replace('custom_', '');
            const customApi = getCustomApiInfo(customIndex);
            if (!customApi) return [];
            
            apiBaseUrl = customApi.url;
            apiName = customApi.name;
        } else {
            // 内置API
            if (!API_SITES[apiId]) return [];
            apiBaseUrl = API_SITES[apiId].api;
            apiName = API_SITES[apiId].name;
        }

        const cleanBase = apiBaseUrl.trim();
        const hasQ = cleanBase.includes('?');
        const sep = hasQ ? '&' : (cleanBase.endsWith('/') ? '?' : '/?');
        apiUrl = `${cleanBase}${sep}ac=videolist&wd=${encodeURIComponent(query)}`;
        
        // 记录请求发起时间，用于精确测速
        const reqStartTime = (typeof performance !== 'undefined') ? performance.now() : Date.now();

        // 添加超时处理
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        // 添加鉴权参数到代理URL
        const proxiedUrl = await window.ProxyAuth?.addAuthToProxyUrl ? 
            await window.ProxyAuth.addAuthToProxyUrl(PROXY_URL + encodeURIComponent(apiUrl)) :
            PROXY_URL + encodeURIComponent(apiUrl);
        
        const response = await fetch(proxiedUrl, {
            headers: API_CONFIG.search.headers,
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        // 计算响应延迟 (毫秒)
        const reqEndTime = (typeof performance !== 'undefined') ? performance.now() : Date.now();
        const latency = Math.round(reqEndTime - reqStartTime);
        
        if (!response.ok) {
            return [];
        }
        
        const ct = response.headers.get('content-type') || '';
        const rawText = await response.text();
        let data = null;
        if (ct.includes('xml') || rawText.trim().startsWith('<?xml') || rawText.trim().startsWith('<rss')) {
            data = window.parseXmlCmsResponse ? window.parseXmlCmsResponse(rawText) : null;
        } else {
            try {
                data = JSON.parse(rawText);
            } catch (err) {
                return [];
            }
        }
        
        if (!data || !data.list || !Array.isArray(data.list) || data.list.length === 0) {
            return [];
        }
        
        // 维护已处理的 ID 集合，彻底防止同源重复与假分页刷屏
        const seenIds = new Set();
        const results = [];
        
        data.list.forEach(item => {
            if (!item) return;
            const idKey = String(item.vod_id || item.vod_name || '');
            if (!seenIds.has(idKey)) {
                seenIds.add(idKey);
                results.push({
                    ...item,
                    source_name: apiName,
                    source_code: apiId,
                    source_latency: latency,
                    api_url: apiId.startsWith('custom_') ? getCustomApiInfo(apiId.replace('custom_', ''))?.url : undefined
                });
            }
        });
        
        // 获取总页数
        const pageCount = data.pagecount || 1;
        // 确定需要获取的额外页数 (限制在 API_CONFIG.search.maxPages 范围内)
        const maxPagesAllowed = (API_CONFIG.search && API_CONFIG.search.maxPages) ? API_CONFIG.search.maxPages : 5;
        const pagesToFetch = Math.min(pageCount - 1, maxPagesAllowed - 1);
        
        // 如果有额外页数，依次获取更多页的结果，并进行假分页熔断检测
        if (pagesToFetch > 0) {
            for (let page = 2; page <= pagesToFetch + 1; page++) {
                // 构建分页URL
                const pageUrl = `${cleanBase}${sep}ac=videolist&wd=${encodeURIComponent(query)}&pg=${page}`;
                
                try {
                    const pageController = new AbortController();
                    const pageTimeoutId = setTimeout(() => pageController.abort(), 10000);
                    
                    // 添加鉴权参数到代理URL
                    const proxiedPageUrl = await window.ProxyAuth?.addAuthToProxyUrl ? 
                        await window.ProxyAuth.addAuthToProxyUrl(PROXY_URL + encodeURIComponent(pageUrl)) :
                        PROXY_URL + encodeURIComponent(pageUrl);
                    
                    const pageResponse = await fetch(proxiedPageUrl, {
                        headers: API_CONFIG.search.headers,
                        signal: pageController.signal
                    });
                    
                    clearTimeout(pageTimeoutId);
                    
                    if (!pageResponse.ok) break;
                    
                    const pageCt = pageResponse.headers.get('content-type') || '';
                    const pageRawText = await pageResponse.text();
                    let pageData = null;
                    if (pageCt.includes('xml') || pageRawText.trim().startsWith('<?xml') || pageRawText.trim().startsWith('<rss')) {
                        pageData = window.parseXmlCmsResponse ? window.parseXmlCmsResponse(pageRawText) : null;
                    } else {
                        try {
                            pageData = JSON.parse(pageRawText);
                        } catch (e) {
                            break;
                        }
                    }
                    
                    if (!pageData || !pageData.list || !Array.isArray(pageData.list) || pageData.list.length === 0) {
                        break; // 无更多数据，停止翻页
                    }
                    
                    // 假分页检测：若第 2 页第一项与第 1 页第一项完全一致，说明上游 CMS 不支持翻页或固定返回第 1 页
                    const firstPageItemKey = String(pageData.list[0]?.vod_id || pageData.list[0]?.vod_name || '');
                    if (seenIds.has(firstPageItemKey)) {
                        // 命中假分页或重复页，立即熔断跳出，不再拉取后续页面
                        break;
                    }
                    
                    let newAddedInPage = 0;
                    pageData.list.forEach(item => {
                        if (!item) return;
                        const idKey = String(item.vod_id || item.vod_name || '');
                        if (!seenIds.has(idKey)) {
                            seenIds.add(idKey);
                            results.push({
                                ...item,
                                source_name: apiName,
                                source_code: apiId,
                                source_latency: latency,
                                api_url: apiId.startsWith('custom_') ? getCustomApiInfo(apiId.replace('custom_', ''))?.url : undefined
                            });
                            newAddedInPage++;
                        }
                    });
                    
                    // 如果整页都没有任何新内容，说明已经到底或进入循环，立即停止
                    if (newAddedInPage === 0) {
                        break;
                    }
                } catch (pageErr) {
                    // 单页超时或出错不影响已有结果，停止后续翻页
                    break;
                }
            }
        }
        
        return results;
    } catch (error) {
        console.warn(`API ${apiId} 搜索失败:`, error);
        return [];
    }
}

/**
 * 影视名称文本清洗与归一化
 */
function normalizeTitle(str) {
    if (!str) return '';
    return str
        .toLowerCase()
        // 去除常见的各类括号及其内部的标签信息，如 [4K超清]、(国语版)、【全集】
        .replace(/\[[^\]]*\]|\([^\)]*\)|【[^】]*】|（[^）]*）/g, '')
        // 去除常见的清晰度、版别、集数修饰
        .replace(/\b(4k|2160p|1080p|720p|hd|bd|tc|ts|hdr|h265|x264|中字|国语|粤语|完结|更新至\d+集|第[0-9一二三四五六七八九十]+[季部集])\b/gi, '')
        // 去除特殊字符与标点空格
        .replace(/[\s\-_:：·.,!！？?~_—/\\|]/g, '')
        .trim();
}

/**
 * 智能相关度匹配算法 (0 ~ 100 分)
 * @param {string} rawQuery - 用户输入的搜索关键词
 * @param {string} rawTitle - 视频标题
 * @returns {number} 匹配度得分
 */
function calculateRelevance(rawQuery, rawTitle) {
    if (!rawQuery || !rawTitle) return 0;
    
    const qClean = rawQuery.trim().toLowerCase().replace(/[\s\-_:：·.,!！？?~_—/\\|]/g, '');
    const tClean = rawTitle.trim().toLowerCase().replace(/[\s\-_:：·.,!！？?~_—/\\|]/g, '');
    
    if (!qClean || !tClean) return 0;
    
    // 1. 绝对完全匹配
    if (tClean === qClean) {
        return 100;
    }
    
    const normQ = normalizeTitle(rawQuery);
    const normT = normalizeTitle(rawTitle);
    
    // 2. 清洗后的纯标题完全相等 (例如搜索 "择天记"，片名为 "择天记 [4K版]")
    if (normQ && normT && normQ === normT) {
        return 98;
    }
    
    // 3. 前缀完全匹配 (例如 "择天记 第一季", "择天记动画版")
    if (tClean.startsWith(qClean) || (normT && normQ && normT.startsWith(normQ))) {
        const lenDiff = Math.abs(tClean.length - qClean.length);
        return Math.max(85, 96 - lenDiff);
    }
    
    // 4. 包含完整查询词 (例如 "剧版择天记", "新择天记")
    if (tClean.includes(qClean) || (normT && normQ && normT.includes(normQ))) {
        const lenDiff = Math.abs(tClean.length - qClean.length);
        return Math.max(80, 92 - lenDiff * 2);
    }
    
    // 5. 短关键词 (<= 2个字) 严格过滤：若不包含完整词，单字直接淘汰视为 0 分
    // 避免搜 "庆" 出来所有带庆字的，搜 "唐探" 出来所有只带一个 "唐" 或 "探" 字的垃圾
    if (qClean.length <= 2) {
        return 0;
    }
    
    // 6. 中长词 (>= 3个字)：检测最大连续公共子串与字符重合度
    let maxSubstrLen = 0;
    for (let len = qClean.length - 1; len >= 2; len--) {
        for (let i = 0; i <= qClean.length - len; i++) {
            const sub = qClean.substr(i, len);
            if (tClean.includes(sub)) {
                maxSubstrLen = Math.max(maxSubstrLen, len);
                break;
            }
        }
        if (maxSubstrLen > 0) break;
    }
    
    // 统计字符命中数
    let matchedChars = 0;
    for (const char of qClean) {
        if (tClean.includes(char)) {
            matchedChars++;
        }
    }
    const charRatio = matchedChars / qClean.length;
    
    // 要求：子串长度必须达到大半，且字符覆盖率必须很高 (>= 75%)
    // 绝不允许单字拆分 (如 "择天记" 搜出 "老友记"、"记住这一天"、"妻不择食")
    if (maxSubstrLen >= Math.ceil(qClean.length * 0.75) && charRatio >= 0.75) {
        return Math.round(60 + charRatio * 15);
    }
    
    // 其余单字、碎片孤立匹配直接给出极低分 (< 40)
    return Math.round(charRatio * 30);
}

/**
 * 视频画质与版本特征识别
 * @param {Object} item - 视频数据项
 * @returns {Object} 画质信息及加权分
 */
function detectVideoQuality(item) {
    if (!item) return { tag: null, color: '', scoreBonus: 0, isHighQuality: false };
    
    const textPool = [
        item.vod_remarks || '',
        item.vod_name || '',
        item.type_name || '',
        item.source_name || ''
    ].join(' ').toUpperCase();

    // 1. 枪版 / 预告片 劣质标识（大幅降权）
    if (/TC|TS|枪版|抢先版|韩版抢先|偷拍|录屏/i.test(textPool)) {
        return {
            tag: '抢先版',
            color: 'bg-amber-600/90 text-white font-medium',
            scoreBonus: -30,
            isPoorQuality: true
        };
    }
    if (/预告|片花|花絮/i.test(textPool) && !/正片/i.test(textPool)) {
        return {
            tag: '预告',
            color: 'bg-red-600/90 text-white font-medium',
            scoreBonus: -50,
            isPoorQuality: true
        };
    }

    // 2. 4K / 2160P 顶级画质（强力加分优先）
    if (/4K|2160P|UHD|原盘|HDR|杜比|DOLBY/i.test(textPool)) {
        return {
            tag: '4K',
            color: 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-bold shadow-sm',
            scoreBonus: 25,
            isHighQuality: true
        };
    }

    // 3. 1080P / 蓝光 / BD 超清画质
    if (/1080P|蓝光|BD|超清|HD1080|1080/i.test(textPool)) {
        return {
            tag: '1080P',
            color: 'bg-blue-600/90 text-white font-medium',
            scoreBonus: 15,
            isHighQuality: true
        };
    }

    // 4. 720P / 高清 / HD
    if (/720P|高清|HD/i.test(textPool)) {
        return {
            tag: 'HD',
            color: 'bg-emerald-600/90 text-white',
            scoreBonus: 5,
            isHighQuality: false
        };
    }

    // 默认无特殊画质标签
    return {
        tag: null,
        color: '',
        scoreBonus: 0,
        isHighQuality: false
    };
}

/**
 * 格式化响应延迟徽章 HTML
 * @param {number} latency - 毫秒延迟
 * @returns {string} 徽章 HTML 字符串
 */
function formatLatencyBadge(latency) {
    if (!latency || latency <= 0) return '';
    if (latency < 600) {
        return `<span class="inline-flex items-center text-[11px] font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.5 rounded" title="响应延迟 ${latency}ms">⚡ ${latency}ms</span>`;
    } else if (latency < 1500) {
        return `<span class="inline-flex items-center text-[11px] font-medium text-yellow-400 bg-yellow-950/60 border border-yellow-500/30 px-1.5 py-0.5 rounded" title="响应延迟 ${latency}ms">⚡ ${latency}ms</span>`;
    } else {
        const sec = (latency / 1000).toFixed(1);
        return `<span class="inline-flex items-center text-[11px] font-medium text-amber-400 bg-amber-950/60 border border-amber-500/30 px-1.5 py-0.5 rounded" title="响应延迟 ${latency}ms">⚡ ${sec}s</span>`;
    }
}

// 暴露为全局函数供 app.js 与 player.js 使用
window.normalizeTitle = normalizeTitle;
window.calculateRelevance = calculateRelevance;
window.detectVideoQuality = detectVideoQuality;
window.formatLatencyBadge = formatLatencyBadge;