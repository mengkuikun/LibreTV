/**
 * TVBox 协议适配与接口导入模块 (100% 兼容 Cloudflare Pages)
 * 纯客户端原生 JS 实现，不依赖任何 Node.js 专属环境
 */

(function(window) {
    'use strict';

    const TVBox = {
        // 版本标识
        version: '1.0.0',

        /**
         * 纯前端安全 Base64 UTF-8 解码
         */
        decodeBase64Utf8: function(str) {
            if (!str || typeof str !== 'string') return null;
            str = str.trim();
            // 常见 TVBox 加密前缀去除 (部分配置带有 ** 或 特殊前缀)
            if (str.startsWith('**')) str = str.slice(2);
            try {
                const bin = atob(str);
                const bytes = new Uint8Array(bin.length);
                for (let i = 0; i < bin.length; i++) {
                    bytes[i] = bin.charCodeAt(i);
                }
                return new TextDecoder('utf-8').decode(bytes);
            } catch (e) {
                return null;
            }
        },

        /**
         * 纯前端容错清洗 JSON 文本（移除 UTF-8 BOM、单行/多行注释、尾随逗号）
         */
        sanitizeJsonText: function(text) {
            if (!text || typeof text !== 'string') return '';
            let s = text.trim();
            if (s.charCodeAt(0) === 0xFEFF) s = s.slice(1);
            // 移除 // 单行注释 (不破坏 http:// 与 https://)
            s = s.replace(/(^|[^:])\/\/.*$/gm, '$1');
            // 移除 /* ... */ 块级注释
            s = s.replace(/\/\*[\s\S]*?\*\//g, '');
            // 移除数组或对象末尾的非标准逗号 (如 {"a": 1,} 或 [1, 2,])
            s = s.replace(/,\s*([\}\]])/g, '$1');
            return s.trim();
        },

        /**
         * 解包 TVBox 中常见的本地代理回环 URL
         * 例如将 http://127.0.0.1:10079/p/0/proxy/https://ikunzyapi.com/api.php/provide/vod/?
         * 还原为 https://ikunzyapi.com/api.php/provide/vod/?
         */
        unwrapProxyUrl: function(url) {
            if (!url || typeof url !== 'string') return '';
            let u = url.trim();
            const match = u.match(/^https?:\/\/(?:127\.0\.0\.1|localhost):\d+\/[^?#]*?(https?:\/\/.*)$/i);
            if (match && match[1]) {
                return match[1];
            }
            return u;
        },

        /**
         * 标准化 API URL
         */
        normalizeApiUrl: function(url) {
            if (!url || typeof url !== 'string') return '';
            let u = this.unwrapProxyUrl(url);
            // 兼容非 http(s) 开头
            if (!/^https?:\/\//i.test(u)) {
                u = 'http://' + u;
            }
            return u;
        },

        /**
         * 检查接口类型兼容性
         * 返回: { compatible: boolean, reason: string, standardType: number, effectiveApi?: string }
         */
        checkCompatibility: function(site) {
            if (!site) {
                return { compatible: false, reason: '无效站点配置', standardType: -1 };
            }

            const rawApi = this.normalizeApiUrl(site.api || site.url || '');
            const rawType = typeof site.type !== 'undefined' ? parseInt(site.type, 10) : 1;
            const apiLower = rawApi.toLowerCase();
            const extStr = typeof site.ext === 'string' ? this.unwrapProxyUrl(site.ext.trim()) : '';

            // Type 3: Spider 爬虫
            if (rawType === 3) {
                // 很多 TVBox 站点虽然标为 type: 3，但实际是 AppYsV2 / XBPQ，其 ext 属性是一个直接的苹果 CMS / 采集接口
                if (extStr && /^https?:\/\//i.test(extStr) && (extStr.includes('provide/vod') || extStr.includes('api.php'))) {
                    return {
                        compatible: true,
                        reason: 'Type 3 包装的 CMS 扩展接口',
                        standardType: 1,
                        effectiveApi: extStr
                    };
                }
                return {
                    compatible: false,
                    reason: 'TVBox Type 3 Jar 爬虫依赖 Android 虚拟机环境，纯 Web/CF 端暂不支持原生运行',
                    standardType: 3
                };
            }

            if (!rawApi) {
                return { compatible: false, reason: '缺少 API 地址', standardType: -1 };
            }

            // Type 4: Hipy / T4 HTTP 爬虫接口
            if (rawType === 4) {
                return { compatible: true, reason: 'T4 HTTP 接口，支持自适应解析', standardType: 4, effectiveApi: rawApi };
            }

            // Type 0: 苹果/海洋 CMS XML 接口
            if (rawType === 0 || apiLower.includes('at/xml')) {
                return { compatible: true, reason: 'CMS XML 接口，支持自适应解析', standardType: 0, effectiveApi: rawApi };
            }

            // Type 1: 苹果 CMS JSON 接口 (原生 100% 完美支持)
            if (rawType === 1 || apiLower.includes('provide/vod') || apiLower.includes('api.php') || apiLower.includes('/vod')) {
                return { compatible: true, reason: '标准 CMS JSON 接口，原生支持', standardType: 1, effectiveApi: rawApi };
            }

            // 默认尝试作为 CMS 接口解析
            return { compatible: true, reason: '通用视频采集接口', standardType: 1, effectiveApi: rawApi };
        },

        /**
         * 解析 TVBox 配置内容 (支持 JSON 文本或 Base64 密文，自动识别单仓与多仓)
         */
        parseConfigText: function(rawContent) {
            if (!rawContent || typeof rawContent !== 'string') {
                throw new Error('配置内容为空');
            }

            let text = rawContent.trim();
            // 常见 TVBox 加密前缀去除 (部分配置带有 ** 或 特殊前缀)
            if (text.startsWith('**')) text = text.slice(2).trim();

            // 0. 如果用户直接输入/粘贴了单条 http(s) 链接（如单个 CMS 接口或采集站 URL）
            if (/^https?:\/\/[^\s]+$/i.test(text)) {
                const siteName = this.detectCmsNameFromUrl(text);
                const isXml = /xml/i.test(text);
                return {
                    isMultiWarehouse: false,
                    spider: '',
                    parses: [],
                    compatibleSites: [{
                        key: 'cms_' + Date.now(),
                        name: siteName,
                        api: text,
                        type: isXml ? 0 : 1,
                        detail: '',
                        ext: '',
                        searchable: 1,
                        quickSearch: 1,
                        compatible: true,
                        reason: `已识别为标准 CMS ${isXml ? 'XML' : 'JSON'} 采集接口`
                    }],
                    incompatibleSites: [],
                    total: 1
                };
            }

            let parsedData = null;

            // 1. 尝试直接作为容错 JSON 解析
            try {
                const cleaned = this.sanitizeJsonText(text);
                parsedData = JSON.parse(cleaned);
            } catch (e) {
                // 2. 尝试 Base64 解码后再解析
                const decoded = this.decodeBase64Utf8(text);
                if (decoded) {
                    try {
                        const cleanedDecoded = this.sanitizeJsonText(decoded);
                        parsedData = JSON.parse(cleanedDecoded);
                    } catch (err) {
                        // 尝试在解码文本中查找 JSON 结构
                        const jsonMatch = decoded.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
                        if (jsonMatch) {
                            try {
                                parsedData = JSON.parse(this.sanitizeJsonText(jsonMatch[0]));
                            } catch (e3) {}
                        }
                    }
                }
            }

            if (!parsedData) {
                throw new Error('无法解析配置内容，请确认是否为合法的 JSON、Base64 TVBox 订阅或 CMS 接口链接');
            }

            // 2.5 自动兼容用户粘贴或接口直接返回的 CMS 数据响应 (包含 list 数组或 code/page 属性)
            if (parsedData && (Array.isArray(parsedData.list) || typeof parsedData.page !== 'undefined' || (parsedData.code === 1 && parsedData.msg))) {
                return {
                    isMultiWarehouse: false,
                    spider: '',
                    parses: [],
                    compatibleSites: [{
                        key: 'cms_' + Date.now(),
                        name: '自定义 CMS 采集接口',
                        api: '',
                        type: 1,
                        detail: '',
                        ext: '',
                        searchable: 1,
                        quickSearch: 1,
                        compatible: true,
                        reason: '成功识别标准 CMS 采集数据响应'
                    }],
                    incompatibleSites: [],
                    total: 1
                };
            }

            // 3. 自动识别多仓聚合格式 (Multi-warehouse)
            if (Array.isArray(parsedData.urls) && parsedData.urls.length > 0) {
                const warehouseLines = parsedData.urls.map((u, i) => ({
                    name: (u.name || `线路 ${i + 1}`).trim(),
                    url: (u.url || '').trim()
                })).filter(u => u.url.length > 0);

                return {
                    isMultiWarehouse: true,
                    warehouses: warehouseLines,
                    spider: parsedData.spider || '',
                    compatibleSites: [],
                    incompatibleSites: [],
                    total: warehouseLines.length
                };
            }

            // 4. 提取 sites 数组 (可能在 parsedData.sites 中，或 parsedData 本身就是数组)
            let rawSites = [];
            if (Array.isArray(parsedData)) {
                rawSites = parsedData;
            } else if (Array.isArray(parsedData.sites)) {
                rawSites = parsedData.sites;
            } else {
                throw new Error('配置中未包含有效的 sites 视频源列表或 urls 多仓线路');
            }

            const compatibleSites = [];
            const incompatibleSites = [];

            rawSites.forEach((s, index) => {
                if (!s || (!s.api && !s.url && !s.ext)) return;
                const check = this.checkCompatibility(s);
                const finalApi = check.effectiveApi || this.normalizeApiUrl(s.api || s.url || '');
                const siteName = (s.name || s.key || `TVBox源_${index + 1}`).trim();
                const siteKey = (s.key || `tvbox_${index}_${Date.now()}`).replace(/[^\w-]/g, '_');

                const siteObj = {
                    key: siteKey,
                    name: siteName,
                    api: finalApi,
                    type: check.standardType,
                    detail: s.detail || '',
                    ext: s.ext || '',
                    searchable: typeof s.searchable !== 'undefined' ? s.searchable : 1,
                    quickSearch: typeof s.quickSearch !== 'undefined' ? s.quickSearch : 1,
                    compatible: check.compatible,
                    reason: check.reason,
                    raw: s
                };

                if (check.compatible) {
                    compatibleSites.push(siteObj);
                } else {
                    incompatibleSites.push(siteObj);
                }
            });

            return {
                isMultiWarehouse: false,
                spider: parsedData.spider || '',
                parses: parsedData.parses || [],
                compatibleSites: compatibleSites,
                incompatibleSites: incompatibleSites,
                total: rawSites.length
            };
        },

        /**
         * 根据 URL 或元数据自动推测友好的 CMS 源名称
         */
        detectCmsNameFromUrl: function(url) {
            if (!url) return '自定义采集源';
            const u = url.toLowerCase();
            if (u.includes('guangsu')) return '光速资源';
            if (u.includes('360zy')) return '360资源';
            if (u.includes('dyttzy') || u.includes('dytt')) return '电影天堂';
            if (u.includes('jszy')) return '极速资源';
            if (u.includes('mdzy')) return '魔都资源';
            if (u.includes('huya')) return '虎牙采集';
            if (u.includes('rycj') || u.includes('ruyi')) return '如意影视';
            if (u.includes('apibdzy') || u.includes('bdzy')) return '百度云资源';
            if (u.includes('klhj') || u.includes('serv00')) return '克隆合集';
            if (u.includes('bfzy')) return '暴风资源';
            if (u.includes('lzi') || u.includes('lzzy')) return '量子资源';
            if (u.includes('ffzy')) return '非凡资源';
            if (u.includes('jyzy') || u.includes('jinying')) return '金鹰资源';
            if (u.includes('wujin')) return '无尽资源';
            if (u.includes('qijiyun')) return '奇迹云4K';
            
            try {
                const host = new URL(url).hostname;
                return host.replace(/^api\./, '').replace(/\.(com|cn|me|net|xyz|vip|top|org)$/, '') + '资源';
            } catch (e) {
                return '自定义采集源';
            }
        },

        /**
         * 探测并包装单个 CMS 采集接口
         */
        probeSingleCmsUrl: async function(targetUrl) {
            const cleanBase = targetUrl.trim();
            const hasQ = cleanBase.includes('?');
            const sep = hasQ ? '&' : (cleanBase.endsWith('/') ? '?' : '/?');
            const testUrl = `${cleanBase}${sep}ac=videolist&wd=test`;

            const proxyBase = typeof PROXY_URL !== 'undefined' ? PROXY_URL : '/proxy/';
            let proxiedUrl = proxyBase + encodeURIComponent(testUrl);
            if (window.ProxyAuth && window.ProxyAuth.addAuthToProxyUrl) {
                proxiedUrl = await window.ProxyAuth.addAuthToProxyUrl(proxiedUrl);
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);

            try {
                const res = await fetch(proxiedUrl, {
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                const text = await res.text();
                const isJson = text.includes('"list"') || text.includes('"code"');
                const isXml = text.includes('<video>') || text.includes('<rss');

                if (res.ok && (isJson || isXml)) {
                    const siteName = this.detectCmsNameFromUrl(targetUrl);
                    const site = {
                        key: 'cms_' + Date.now(),
                        name: siteName,
                        api: cleanBase,
                        type: isXml ? 0 : 1,
                        compatible: true,
                        reason: `已识别为标准 CMS ${isJson ? 'JSON' : 'XML'} 采集接口`,
                        searchable: 1,
                        quickSearch: 1
                    };
                    return {
                        isMultiWarehouse: false,
                        spider: '',
                        parses: [],
                        compatibleSites: [site],
                        incompatibleSites: [],
                        total: 1
                    };
                }
            } catch (e) {
                clearTimeout(timeoutId);
            }
            return null;
        },

        /**
         * 从远程 URL 加载并解析 TVBox 配置或单 CMS 采集源
         */
        fetchAndParseUrl: async function(configUrl) {
            if (!configUrl || !/^https?:\/\//i.test(configUrl.trim())) {
                throw new Error('请输入合法的 http:// 或 https:// 接口或订阅链接');
            }

            const targetUrl = configUrl.trim();
            
            // 优先检查：如果链接特征为 CMS 采集站接口（如包含 provide/vod、api.php、seaxml 等），直接自适应探测
            const isLikelyCms = /provide\/vod|api\.php|seaxml|at\/xml|ac=videolist/i.test(targetUrl);
            if (isLikelyCms) {
                let singleCmsResult = null;
                try {
                    singleCmsResult = await this.probeSingleCmsUrl(targetUrl);
                } catch (e) {}
                if (singleCmsResult && singleCmsResult.compatibleSites && singleCmsResult.compatibleSites.length > 0) {
                    return singleCmsResult;
                }
                // 即便快速网络探测未通，因 URL 结构符合标准 CMS 接口特征，依然直接生成可用卡片供用户导入
                const siteName = this.detectCmsNameFromUrl(targetUrl);
                const isXml = /xml/i.test(targetUrl);
                return {
                    isMultiWarehouse: false,
                    spider: '',
                    parses: [],
                    compatibleSites: [{
                        key: 'cms_' + Date.now(),
                        name: siteName,
                        api: targetUrl,
                        type: isXml ? 0 : 1,
                        detail: '',
                        ext: '',
                        searchable: 1,
                        quickSearch: 1,
                        compatible: true,
                        reason: `已识别为标准 CMS ${isXml ? 'XML' : 'JSON'} 采集接口`
                    }],
                    incompatibleSites: [],
                    total: 1
                };
            }

            const proxyBase = typeof PROXY_URL !== 'undefined' ? PROXY_URL : '/proxy/';
            
            // 构建带签名的代理请求
            let finalUrl = proxyBase + encodeURIComponent(targetUrl);
            if (window.ProxyAuth && window.ProxyAuth.addAuthToProxyUrl) {
                finalUrl = await window.ProxyAuth.addAuthToProxyUrl(finalUrl);
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 12000);

            try {
                const response = await fetch(finalUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'text/plain, application/json, */*'
                    },
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`获取配置失败，HTTP状态码: ${response.status}`);
                }

                const text = await response.text();
                try {
                    const parsed = this.parseConfigText(text);
                    // 如果识别为单源但 api 字段未填（如 CMS JSON 响应），自动填充为请求的 targetUrl
                    if (parsed.compatibleSites && parsed.compatibleSites.length === 1 && !parsed.compatibleSites[0].api) {
                        parsed.compatibleSites[0].api = targetUrl;
                        parsed.compatibleSites[0].name = this.detectCmsNameFromUrl(targetUrl);
                    }
                    return parsed;
                } catch (parseErr) {
                    // 如果 TVBox 订阅解析失败，尝试作为单源探测回退
                    const fallbackCms = await this.probeSingleCmsUrl(targetUrl);
                    if (fallbackCms) {
                        return fallbackCms;
                    }
                    throw parseErr;
                }
            } catch (e) {
                clearTimeout(timeoutId);
                if (e.name === 'AbortError') {
                    throw new Error('请求订阅配置超时，请检查网络或链接是否可用');
                }
                throw e;
            }
        },

        /**
         * 单个接口连通性测速 (ms)
         */
        testSiteLatency: async function(apiUrl) {
            const startTime = Date.now();
            const proxyBase = typeof PROXY_URL !== 'undefined' ? PROXY_URL : '/proxy/';
            
            let normalizedUrl = apiUrl.trim();
            let testParam = normalizedUrl.includes('?') ? '&ac=videolist&wd=test' : (normalizedUrl.endsWith('/') ? '?ac=videolist&wd=test' : '/?ac=videolist&wd=test');
            const targetUrl = normalizedUrl + testParam;

            let finalUrl = proxyBase + encodeURIComponent(targetUrl);
            if (window.ProxyAuth && window.ProxyAuth.addAuthToProxyUrl) {
                finalUrl = await window.ProxyAuth.addAuthToProxyUrl(finalUrl);
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);

            try {
                const response = await fetch(finalUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Accept': 'application/json, text/xml, */*'
                    },
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                const latency = Date.now() - startTime;
                if (!response.ok) {
                    return { success: false, latency: latency, error: `HTTP ${response.status}` };
                }

                const text = await response.text();
                // 检查是否返回了基本的列表数据结构
                const isJsonValid = text.includes('"list"') || text.includes('"code"');
                const isXmlValid = text.includes('<video>') || text.includes('<rss') || text.includes('</rss>');

                if (isJsonValid || isXmlValid) {
                    return { success: true, latency: latency, isXml: isXmlValid };
                } else {
                    return { success: false, latency: latency, error: '响应格式不匹配' };
                }
            } catch (e) {
                clearTimeout(timeoutId);
                return { success: false, latency: Date.now() - startTime, error: e.message || '连接超时' };
            }
        },

        /**
         * 批量将站点导入至自定义源 (localStorage['customAPIs'])
         */
        importSitesToCustom: function(sitesToImport, overwrite = false) {
            if (!Array.isArray(sitesToImport) || sitesToImport.length === 0) {
                return { success: false, count: 0, message: '没有选中的接口' };
            }

            let existingCustomAPIs = [];
            try {
                existingCustomAPIs = JSON.parse(localStorage.getItem('customAPIs') || '[]');
            } catch (e) {
                existingCustomAPIs = [];
            }

            if (overwrite) {
                existingCustomAPIs = [];
            }

            let importedCount = 0;
            sitesToImport.forEach(site => {
                const siteUrl = (site.api || site.url || '').trim();
                const siteName = (site.name || '未命名接口').trim();

                // 避免重复导入完全相同的 URL
                const exists = existingCustomAPIs.some(item => item.url === siteUrl);
                if (!exists) {
                    existingCustomAPIs.push({
                        name: siteName,
                        url: siteUrl,
                        detail: site.detail || '',
                        type: site.type || 1,
                        isAdult: site.isAdult || false
                    });
                    importedCount++;
                }
            });

            // 保存到 localStorage
            localStorage.setItem('customAPIs', JSON.stringify(existingCustomAPIs));

            // 更新 selectedAPIs 自动选中新加入的源
            try {
                let selectedAPIs = JSON.parse(localStorage.getItem('selectedAPIs') || '[]');
                existingCustomAPIs.forEach((_, idx) => {
                    const customId = 'custom_' + idx;
                    if (!selectedAPIs.includes(customId)) {
                        selectedAPIs.push(customId);
                    }
                });
                localStorage.setItem('selectedAPIs', JSON.stringify(selectedAPIs));
            } catch (e) {
                console.error('更新选中状态失败:', e);
            }

            return {
                success: true,
                count: importedCount,
                total: existingCustomAPIs.length,
                message: `成功导入 ${importedCount} 个新接口！当前自定义源共计 ${existingCustomAPIs.length} 个。`
            };
        },

        /**
         * 导出当前的自定义接口为 TVBox 标准 JSON 格式
         */
        exportToTvboxJson: function() {
            let customAPIs = [];
            try {
                customAPIs = JSON.parse(localStorage.getItem('customAPIs') || '[]');
            } catch (e) {
                customAPIs = [];
            }

            const sites = customAPIs.map((item, idx) => ({
                key: `custom_${idx}`,
                name: item.name,
                type: item.type || 1,
                api: item.url,
                searchable: 1,
                quickSearch: 1,
                filterable: 1
            }));

            const tvboxConfig = {
                sites: sites
            };

            return JSON.stringify(tvboxConfig, null, 2);
        }
    };

    window.TVBox = TVBox;

})(typeof window !== 'undefined' ? window : this);
