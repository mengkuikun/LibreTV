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