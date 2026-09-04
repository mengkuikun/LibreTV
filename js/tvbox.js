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
         * 标准化 API URL
         */
        normalizeApiUrl: function(url) {
            if (!url || typeof url !== 'string') return '';
            let u = url.trim();
            // 兼容非 http(s) 开头
            if (!/^https?:\/\//i.test(u)) {
                u = 'http://' + u;
            }
            return u;
        },

        /**
         * 检查接口类型兼容性
         * 返回: { compatible: boolean, reason: string, standardType: number }
         */
        checkCompatibility: function(site) {
            if (!site || !site.api) {
                return { compatible: false, reason: '缺少 API 地址', standardType: -1 };
            }

            const rawType = parseInt(site.type, 10);
            const api = (site.api || '').toLowerCase();

            // Type 3: Spider 爬虫 (通常是 Android DEX Jar，浏览器环境无法执行)
            if (rawType === 3) {
                return {
                    compatible: false,
                    reason: 'TVBox Type 3 Jar 爬虫依赖 Android 虚拟机环境，纯 Web/CF 端暂不支持原生运行',
                    standardType: 3
                };
            }

            // Type 4: Hipy / T4 HTTP 爬虫接口
            if (rawType === 4) {
                return { compatible: true, reason: 'T4 HTTP 接口，支持自适应解析', standardType: 4 };
            }

            // Type 0: 苹果/海洋 CMS XML 接口
            if (rawType === 0 || api.includes('at/xml')) {
                return { compatible: true, reason: 'CMS XML 接口，支持自适应解析', standardType: 0 };
            }

            // Type 1: 苹果 CMS JSON 接口 (原生 100% 完美支持)
            if (rawType === 1 || api.includes('provide/vod') || api.includes('api.php') || api.includes('/vod')) {
                return { compatible: true, reason: '标准 CMS JSON 接口，原生支持', standardType: 1 };
            }

            // 默认尝试作为 CMS 接口解析
            return { compatible: true, reason: '通用视频采集接口', standardType: 1 };
        },

        /**
         * 解析 TVBox 配置内容 (支持 JSON 文本或 Base64 密文)
         */
        parseConfigText: function(rawContent) {
            if (!rawContent || typeof rawContent !== 'string') {
                throw new Error('配置内容为空');
            }

            let text = rawContent.trim();
            let parsedData = null;

            // 1. 尝试直接作为 JSON 解析
            try {
                parsedData = JSON.parse(text);
            } catch (e) {
                // 2. 尝试 Base64 解码后再解析
                const decoded = this.decodeBase64Utf8(text);
                if (decoded) {
                    try {
                        parsedData = JSON.parse(decoded);
                    } catch (err) {
                        // 尝试在解码文本中查找 JSON 结构
                        const jsonMatch = decoded.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
                        if (jsonMatch) {
                            parsedData = JSON.parse(jsonMatch[0]);
                        }
                    }
                }
            }

            if (!parsedData) {
                throw new Error('无法解析配置内容，请确认是否为合法的 JSON 或 Base64 TVBox 订阅格式');
            }

            // 提取 sites 数组 (可能在 parsedData.sites 中，或 parsedData 本身就是数组)
            let rawSites = [];
            if (Array.isArray(parsedData)) {
                rawSites = parsedData;
            } else if (Array.isArray(parsedData.sites)) {
                rawSites = parsedData.sites;
            } else {
                throw new Error('配置中未包含有效的 sites 视频源列表');
            }

            const compatibleSites = [];
            const incompatibleSites = [];

            rawSites.forEach((s, index) => {
                if (!s || (!s.api && !s.url)) return;
                const siteApi = this.normalizeApiUrl(s.api || s.url);
                const siteName = (s.name || s.key || `TVBox源_${index + 1}`).trim();
                const siteKey = (s.key || `tvbox_${index}_${Date.now()}`).replace(/[^\w-]/g, '_');
                const siteType = typeof s.type !== 'undefined' ? parseInt(s.type, 10) : 1;

                const check = this.checkCompatibility({ ...s, api: siteApi, type: siteType });
                const siteObj = {
                    key: siteKey,
                    name: siteName,
                    api: siteApi,
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
                spider: parsedData.spider || '',
                parses: parsedData.parses || [],
                compatibleSites: compatibleSites,
                incompatibleSites: incompatibleSites,
                total: rawSites.length
            };
        },

        /**
         * 从远程 URL 加载并解析 TVBox 配置
         */
        fetchAndParseUrl: async function(configUrl) {
            if (!configUrl || !/^https?:\/\//i.test(configUrl.trim())) {
                throw new Error('请输入合法的 http:// 或 https:// 订阅链接');
            }

            const targetUrl = configUrl.trim();
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
                    throw new Error(`获取订阅失败，HTTP状态码: ${response.status}`);
                }

                const text = await response.text();
                return this.parseConfigText(text);
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
