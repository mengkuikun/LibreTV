// 全局变量
let selectedAPIs = JSON.parse(localStorage.getItem('selectedAPIs') || '["wujin"]'); // 默认选中资源
let customAPIs = JSON.parse(localStorage.getItem('customAPIs') || '[]'); // 存储自定义API列表

// 添加当前播放的集数索引
let currentEpisodeIndex = 0;
// 添加当前视频的所有集数
let currentEpisodes = [];
// 添加当前视频的标题
let currentVideoTitle = '';
// 全局变量用于倒序状态
let episodesReversed = false;

// 多线路与 TVBox 导入全局变量
let currentRoutes = [];
let currentActiveRouteIndex = 0;
let currentEpisodeNames = [];
let currentParsedTvboxSites = [];

document.addEventListener('DOMContentLoaded', function () {
    // 校验并清理已移除的旧内置源，保证默认选中有效优质源
    const validSelected = selectedAPIs.filter(k => API_SITES[k] || k.startsWith('custom_'));
    if (!localStorage.getItem('hasInitializedDefaults') || validSelected.length === 0) {
        // 默认选中优质极速资源
        selectedAPIs = ["guangsu", "360zy", "wujin", "bfzy"].filter(k => API_SITES[k]);
        localStorage.setItem('selectedAPIs', JSON.stringify(selectedAPIs));

        // 默认选中过滤开关
        localStorage.setItem('yellowFilterEnabled', 'true');
        localStorage.setItem(PLAYER_CONFIG.adFilteringStorage, 'true');

        // 默认启用豆瓣功能
        localStorage.setItem('doubanEnabled', 'true');

        // 标记已初始化默认值
        localStorage.setItem('hasInitializedDefaults', 'true');
    } else if (validSelected.length !== selectedAPIs.length) {
        selectedAPIs = validSelected;
        localStorage.setItem('selectedAPIs', JSON.stringify(selectedAPIs));
    }

    // 初始化API复选框
    initAPICheckboxes();

    // 初始化自定义API列表
    renderCustomAPIsList();

    // 初始化显示选中的API数量
    updateSelectedApiCount();

    // 渲染搜索历史
    renderSearchHistory();

    // 设置黄色内容过滤器开关初始状态
    const yellowFilterToggle = document.getElementById('yellowFilterToggle');
    if (yellowFilterToggle) {
        yellowFilterToggle.checked = localStorage.getItem('yellowFilterEnabled') === 'true';
    }

    // 设置广告过滤开关初始状态
    const adFilterToggle = document.getElementById('adFilterToggle');
    if (adFilterToggle) {
        adFilterToggle.checked = localStorage.getItem(PLAYER_CONFIG.adFilteringStorage) !== 'false'; // 默认为true
    }

    // 设置事件监听器
    setupEventListeners();

    // 初始检查成人API选中状态
    setTimeout(checkAdultAPIsSelected, 100);
});

// 初始化API复选框（按影视、短剧、音乐听书分类，100% 保持原站风格）
function initAPICheckboxes() {
    const container = document.getElementById('apiCheckboxes');
    if (!container) return;
    container.innerHTML = '';

    const categories = [
        { key: 'video', name: '普通影视' },
        { key: 'short', name: '短剧资源' },
        { key: 'music', name: '音乐与听书' }
    ];

    categories.forEach((cat, index) => {
        const siteKeys = Object.keys(API_SITES).filter(k => {
            const api = API_SITES[k];
            if (api.adult) return false;
            if (cat.key === 'video') return api.category === 'video' || (!api.category && !api.name.includes('音乐') && !api.name.includes('听书') && !api.name.includes('短剧'));
            if (cat.key === 'short') return api.category === 'short' || (!api.category && api.name.includes('短剧'));
            if (cat.key === 'music') return api.category === 'music' || (!api.category && (api.name.includes('音乐') || api.name.includes('听书')));
            return false;
        });

        if (siteKeys.length === 0) return;

        const groupDiv = document.createElement('div');
        groupDiv.id = `group_${cat.key}`;
        groupDiv.className = 'grid grid-cols-2 gap-2 mb-2';

        const titleDiv = document.createElement('div');
        titleDiv.className = 'api-group-title';
        titleDiv.textContent = cat.name;
        groupDiv.appendChild(titleDiv);

        siteKeys.forEach(apiKey => {
            const api = API_SITES[apiKey];
            const checked = selectedAPIs.includes(apiKey);

            const checkbox = document.createElement('div');
            checkbox.className = 'flex items-center';
            checkbox.innerHTML = `
                <input type="checkbox" id="api_${apiKey}" 
                       class="form-checkbox h-3 w-3 text-blue-600 bg-[#222] border border-[#333]" 
                       ${checked ? 'checked' : ''} 
                       data-api="${apiKey}"
                       data-category="${cat.key}">
                <label for="api_${apiKey}" class="ml-1 text-xs text-gray-400 truncate cursor-pointer" title="${api.name}">${api.name}</label>
            `;
            groupDiv.appendChild(checkbox);

            checkbox.querySelector('input').addEventListener('change', function () {
                updateSelectedAPIs();
                checkAdultAPIsSelected();
            });
        });

        container.appendChild(groupDiv);
    });

    // 添加成人API列表
    addAdultAPI();

    // 初始检查成人内容状态
    checkAdultAPIsSelected();
}

// 添加成人API列表 (100% 保持原站样式与 SVG 图标)
function addAdultAPI() {
    if (!HIDE_BUILTIN_ADULT_APIS && (localStorage.getItem('yellowFilterEnabled') === 'false')) {
        const container = document.getElementById('apiCheckboxes');
        if (!container) return;

        const adultKeys = Object.keys(API_SITES).filter(k => API_SITES[k].adult);
        if (adultKeys.length === 0) return;

        const adultdiv = document.createElement('div');
        adultdiv.id = 'adultdiv';
        adultdiv.className = 'grid grid-cols-2 gap-2 mb-2';

        const adultTitle = document.createElement('div');
        adultTitle.className = 'api-group-title adult';
        adultTitle.innerHTML = `黄色资源采集站 <span class="adult-warning">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
        </span>`;
        adultdiv.appendChild(adultTitle);

        adultKeys.forEach(apiKey => {
            const api = API_SITES[apiKey];
            const checked = selectedAPIs.includes(apiKey);

            const checkbox = document.createElement('div');
            checkbox.className = 'flex items-center';
            checkbox.innerHTML = `
                <input type="checkbox" id="api_${apiKey}" 
                       class="form-checkbox h-3 w-3 text-blue-600 bg-[#222] border border-[#333] api-adult" 
                       ${checked ? 'checked' : ''} 
                       data-api="${apiKey}"
                       data-category="adult">
                <label for="api_${apiKey}" class="ml-1 text-xs text-pink-400 truncate cursor-pointer" title="${api.name}">${api.name}</label>
            `;
            adultdiv.appendChild(checkbox);

            checkbox.querySelector('input').addEventListener('change', function () {
                updateSelectedAPIs();
                checkAdultAPIsSelected();
            });
        });

        container.appendChild(adultdiv);
    }
}

// 检查是否有成人API被选中
function checkAdultAPIsSelected() {
    // 查找所有内置成人API复选框
    const adultBuiltinCheckboxes = document.querySelectorAll('#apiCheckboxes .api-adult:checked');

    // 查找所有自定义成人API复选框
    const customApiCheckboxes = document.querySelectorAll('#customApisList .api-adult:checked');

    const hasAdultSelected = adultBuiltinCheckboxes.length > 0 || customApiCheckboxes.length > 0;

    const yellowFilterToggle = document.getElementById('yellowFilterToggle');
    const yellowFilterContainer = yellowFilterToggle.closest('div').parentNode;
    const filterDescription = yellowFilterContainer.querySelector('p.filter-description');

    // 如果选择了成人API，禁用黄色内容过滤器
    if (hasAdultSelected) {
        yellowFilterToggle.checked = false;
        yellowFilterToggle.disabled = true;
        localStorage.setItem('yellowFilterEnabled', 'false');

        // 添加禁用样式
        yellowFilterContainer.classList.add('filter-disabled');

        // 修改描述文字
        if (filterDescription) {
            filterDescription.innerHTML = '<strong class="text-pink-300">选中黄色资源站时无法启用此过滤</strong>';
        }

        // 移除提示信息（如果存在）
        const existingTooltip = yellowFilterContainer.querySelector('.filter-tooltip');
        if (existingTooltip) {
            existingTooltip.remove();
        }
    } else {
        // 启用黄色内容过滤器
        yellowFilterToggle.disabled = false;
        yellowFilterContainer.classList.remove('filter-disabled');

        // 恢复原来的描述文字
        if (filterDescription) {
            filterDescription.innerHTML = '过滤"伦理片"等黄色内容';
        }

        // 移除提示信息
        const existingTooltip = yellowFilterContainer.querySelector('.filter-tooltip');
        if (existingTooltip) {
            existingTooltip.remove();
        }
    }
}

// 渲染自定义API列表
function renderCustomAPIsList() {
    const container = document.getElementById('customApisList');
    if (!container) return;

    if (customAPIs.length === 0) {
        container.innerHTML = '<p class="text-xs text-gray-500 text-center my-2">未添加自定义API</p>';
        return;
    }

    container.innerHTML = '';
    customAPIs.forEach((api, index) => {
        const apiItem = document.createElement('div');
        apiItem.className = 'flex items-center justify-between p-1 mb-1 bg-[#222] rounded';
        const textColorClass = api.isAdult ? 'text-pink-400' : 'text-white';
        const adultTag = api.isAdult ? '<span class="text-xs text-pink-400 mr-1">(18+)</span>' : '';
        // 新增 detail 地址显示
        const detailLine = api.detail ? `<div class="text-xs text-gray-400 truncate">detail: ${api.detail}</div>` : '';
        apiItem.innerHTML = `
            <div class="flex items-center flex-1 min-w-0">
                <input type="checkbox" id="custom_api_${index}" 
                       class="form-checkbox h-3 w-3 text-blue-600 mr-1 ${api.isAdult ? 'api-adult' : ''}" 
                       ${selectedAPIs.includes('custom_' + index) ? 'checked' : ''} 
                       data-custom-index="${index}">
                <div class="flex-1 min-w-0">
                    <div class="text-xs font-medium ${textColorClass} truncate">
                        ${adultTag}${api.name}
                    </div>
                    <div class="text-xs text-gray-500 truncate">${api.url}</div>
                    ${detailLine}
                </div>
            </div>
            <div class="flex items-center">
                <button class="text-blue-500 hover:text-blue-700 text-xs px-1" onclick="editCustomApi(${index})">✎</button>
                <button class="text-red-500 hover:text-red-700 text-xs px-1" onclick="removeCustomApi(${index})">✕</button>
            </div>
        `;
        container.appendChild(apiItem);
        apiItem.querySelector('input').addEventListener('change', function () {
            updateSelectedAPIs();
            checkAdultAPIsSelected();
        });
    });
}

// 编辑自定义API
function editCustomApi(index) {
    if (index < 0 || index >= customAPIs.length) return;
    const api = customAPIs[index];
    document.getElementById('customApiName').value = api.name;
    document.getElementById('customApiUrl').value = api.url;
    document.getElementById('customApiDetail').value = api.detail || '';
    const isAdultInput = document.getElementById('customApiIsAdult');
    if (isAdultInput) isAdultInput.checked = api.isAdult || false;
    const form = document.getElementById('addCustomApiForm');
    if (form) {
        form.classList.remove('hidden');
        const buttonContainer = form.querySelector('div:last-child');
        buttonContainer.innerHTML = `
            <button onclick="updateCustomApi(${index})" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs">更新</button>
            <button onclick="cancelEditCustomApi()" class="bg-[#444] hover:bg-[#555] text-white px-3 py-1 rounded text-xs">取消</button>
        `;
    }
}

// 更新自定义API
function updateCustomApi(index) {
    if (index < 0 || index >= customAPIs.length) return;
    const nameInput = document.getElementById('customApiName');
    const urlInput = document.getElementById('customApiUrl');
    const detailInput = document.getElementById('customApiDetail');
    const isAdultInput = document.getElementById('customApiIsAdult');
    const name = nameInput.value.trim();
    let url = urlInput.value.trim();
    const detail = detailInput ? detailInput.value.trim() : '';
    const isAdult = isAdultInput ? isAdultInput.checked : false;
    if (!name || !url) {
        showToast('请输入API名称和链接', 'warning');
        return;
    }
    if (!/^https?:\/\/.+/.test(url)) {
        showToast('API链接格式不正确，需以http://或https://开头', 'warning');
        return;
    }
    if (url.endsWith('/')) url = url.slice(0, -1);
    // 保存 detail 字段
    customAPIs[index] = { name, url, detail, isAdult };
    localStorage.setItem('customAPIs', JSON.stringify(customAPIs));
    renderCustomAPIsList();
    checkAdultAPIsSelected();
    restoreAddCustomApiButtons();
    nameInput.value = '';
    urlInput.value = '';
    if (detailInput) detailInput.value = '';
    if (isAdultInput) isAdultInput.checked = false;
    document.getElementById('addCustomApiForm').classList.add('hidden');
    showToast('已更新自定义API: ' + name, 'success');
}

// 取消编辑自定义API
function cancelEditCustomApi() {
    // 清空表单
    document.getElementById('customApiName').value = '';
    document.getElementById('customApiUrl').value = '';
    document.getElementById('customApiDetail').value = '';
    const isAdultInput = document.getElementById('customApiIsAdult');
    if (isAdultInput) isAdultInput.checked = false;

    // 隐藏表单
    document.getElementById('addCustomApiForm').classList.add('hidden');

    // 恢复添加按钮
    restoreAddCustomApiButtons();
}

// 恢复自定义API添加按钮
function restoreAddCustomApiButtons() {
    const form = document.getElementById('addCustomApiForm');
    const buttonContainer = form.querySelector('div:last-child');
    buttonContainer.innerHTML = `
        <button onclick="addCustomApi()" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs">添加</button>
        <button onclick="cancelAddCustomApi()" class="bg-[#444] hover:bg-[#555] text-white px-3 py-1 rounded text-xs">取消</button>
    `;
}

// 更新选中的API列表
function updateSelectedAPIs() {
    // 获取所有内置API复选框
    const builtInApiCheckboxes = document.querySelectorAll('#apiCheckboxes input:checked');

    // 获取选中的内置API
    const builtInApis = Array.from(builtInApiCheckboxes).map(input => input.dataset.api);

    // 获取选中的自定义API
    const customApiCheckboxes = document.querySelectorAll('#customApisList input:checked');
    const customApiIndices = Array.from(customApiCheckboxes).map(input => 'custom_' + input.dataset.customIndex);

    // 合并内置和自定义API
    selectedAPIs = [...builtInApis, ...customApiIndices];

    // 保存到localStorage
    localStorage.setItem('selectedAPIs', JSON.stringify(selectedAPIs));

    // 更新显示选中的API数量
    updateSelectedApiCount();
}

// 更新选中的API数量显示
function updateSelectedApiCount() {
    const countEl = document.getElementById('selectedApiCount');
    if (countEl) {
        countEl.textContent = selectedAPIs.length;
    }
}

// 全选或取消全选API，支持按分类选择: filterType = 'video' | 'music' | 'short' | 'all' | 'normal'
function selectAllAPIs(selectAll = true, filterType = 'all') {
    const checkboxes = document.querySelectorAll('#apiCheckboxes input[type="checkbox"]');

    checkboxes.forEach(checkbox => {
        const cat = checkbox.getAttribute('data-category') || 'video';
        const isAdult = checkbox.classList.contains('api-adult') || cat === 'adult';

        if (!selectAll) {
            checkbox.checked = false;
            return;
        }

        if (filterType === true || filterType === 'normal') {
            checkbox.checked = !isAdult;
            return;
        }

        if (filterType === 'video') {
            checkbox.checked = (cat === 'video' || cat === 'short') && !isAdult;
        } else if (filterType === 'music') {
            checkbox.checked = (cat === 'music');
        } else if (filterType === 'short') {
            checkbox.checked = (cat === 'short');
        } else {
            checkbox.checked = true;
        }
    });

    updateSelectedAPIs();
    checkAdultAPIsSelected();
}

// 显示添加自定义API表单
function showAddCustomApiForm() {
    const form = document.getElementById('addCustomApiForm');
    if (form) {
        form.classList.remove('hidden');
    }
}

// 取消添加自定义API - 修改函数来重用恢复按钮逻辑
function cancelAddCustomApi() {
    const form = document.getElementById('addCustomApiForm');
    if (form) {
        form.classList.add('hidden');
        document.getElementById('customApiName').value = '';
        document.getElementById('customApiUrl').value = '';
        document.getElementById('customApiDetail').value = '';
        const isAdultInput = document.getElementById('customApiIsAdult');
        if (isAdultInput) isAdultInput.checked = false;

        // 确保按钮是添加按钮
        restoreAddCustomApiButtons();
    }
}

// 添加自定义API
function addCustomApi() {
    const nameInput = document.getElementById('customApiName');
    const urlInput = document.getElementById('customApiUrl');
    const detailInput = document.getElementById('customApiDetail');
    const isAdultInput = document.getElementById('customApiIsAdult');
    const name = nameInput.value.trim();
    let url = urlInput.value.trim();
    const detail = detailInput ? detailInput.value.trim() : '';
    const isAdult = isAdultInput ? isAdultInput.checked : false;
    if (!name || !url) {
        showToast('请输入API名称和链接', 'warning');
        return;
    }
    if (!/^https?:\/\/.+/.test(url)) {
        showToast('API链接格式不正确，需以http://或https://开头', 'warning');
        return;
    }
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    // 保存 detail 字段
    customAPIs.push({ name, url, detail, isAdult });
    localStorage.setItem('customAPIs', JSON.stringify(customAPIs));
    const newApiIndex = customAPIs.length - 1;
    selectedAPIs.push('custom_' + newApiIndex);
    localStorage.setItem('selectedAPIs', JSON.stringify(selectedAPIs));

    // 重新渲染自定义API列表
    renderCustomAPIsList();
    updateSelectedApiCount();
    checkAdultAPIsSelected();
    nameInput.value = '';
    urlInput.value = '';
    if (detailInput) detailInput.value = '';
    if (isAdultInput) isAdultInput.checked = false;
    document.getElementById('addCustomApiForm').classList.add('hidden');
    showToast('已添加自定义API: ' + name, 'success');
}

// 移除自定义API
function removeCustomApi(index) {
    if (index < 0 || index >= customAPIs.length) return;

    const apiName = customAPIs[index].name;

    // 从列表中移除API
    customAPIs.splice(index, 1);
    localStorage.setItem('customAPIs', JSON.stringify(customAPIs));

    // 从选中列表中移除此API
    const customApiId = 'custom_' + index;
    selectedAPIs = selectedAPIs.filter(id => id !== customApiId);

    // 更新大于此索引的自定义API索引
    selectedAPIs = selectedAPIs.map(id => {
        if (id.startsWith('custom_')) {
            const currentIndex = parseInt(id.replace('custom_', ''));
            if (currentIndex > index) {
                return 'custom_' + (currentIndex - 1);
            }
        }
        return id;
    });

    localStorage.setItem('selectedAPIs', JSON.stringify(selectedAPIs));

    // 重新渲染自定义API列表
    renderCustomAPIsList();

    // 更新选中的API数量
    updateSelectedApiCount();

    // 重新检查成人API选中状态
    checkAdultAPIsSelected();

    showToast('已移除自定义API: ' + apiName, 'info');
}

function toggleSettings(e) {
    const settingsPanel = document.getElementById('settingsPanel');
    if (!settingsPanel) return;

    if (settingsPanel.classList.contains('show')) {
        settingsPanel.classList.remove('show');
    } else {
        settingsPanel.classList.add('show');
    }

    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
}

// 设置事件监听器
function setupEventListeners() {
    // 回车搜索
    document.getElementById('searchInput').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            search();
        }
    });

    // 点击外部关闭设置面板和历史记录面板
    document.addEventListener('click', function (e) {
        // 关闭设置面板
        const settingsPanel = document.querySelector('#settingsPanel.show');
        const settingsButton = document.querySelector('#settingsPanel .close-btn');

        if (settingsPanel && settingsButton &&
            !settingsPanel.contains(e.target) &&
            !settingsButton.contains(e.target)) {
            settingsPanel.classList.remove('show');
        }

        // 关闭历史记录面板
        const historyPanel = document.querySelector('#historyPanel.show');
        const historyButton = document.querySelector('#historyPanel .close-btn');

        if (historyPanel && historyButton &&
            !historyPanel.contains(e.target) &&
            !historyButton.contains(e.target)) {
            historyPanel.classList.remove('show');
        }
    });

    // 黄色内容过滤开关事件绑定
    const yellowFilterToggle = document.getElementById('yellowFilterToggle');
    if (yellowFilterToggle) {
        yellowFilterToggle.addEventListener('change', function (e) {
            localStorage.setItem('yellowFilterEnabled', e.target.checked);

            // 控制黄色内容接口的显示状态
            const adultdiv = document.getElementById('adultdiv');
            if (adultdiv) {
                if (e.target.checked === true) {
                    adultdiv.style.display = 'none';
                } else if (e.target.checked === false) {
                    adultdiv.style.display = ''
                }
            } else {
                // 添加成人API列表
                addAdultAPI();
            }
        });
    }

    // 广告过滤开关事件绑定
    const adFilterToggle = document.getElementById('adFilterToggle');
    if (adFilterToggle) {
        adFilterToggle.addEventListener('change', function (e) {
            localStorage.setItem(PLAYER_CONFIG.adFilteringStorage, e.target.checked);
        });
    }
}

// 重置搜索区域
function resetSearchArea() {
    // 清理搜索结果
    document.getElementById('results').innerHTML = '';
    document.getElementById('searchInput').value = '';

    // 恢复搜索区域的样式
    document.getElementById('searchArea').classList.add('flex-1');
    document.getElementById('searchArea').classList.remove('mb-8');
    document.getElementById('resultsArea').classList.add('hidden');

    // 确保页脚正确显示，移除相对定位
    const footer = document.querySelector('.footer');
    if (footer) {
        footer.style.position = '';
    }

    // 如果有豆瓣功能，检查是否需要显示豆瓣推荐区域
    if (typeof updateDoubanVisibility === 'function') {
        updateDoubanVisibility();
    }

    // 重置URL为主页
    try {
        window.history.pushState(
            {},
            `LibreTV - 免费在线视频搜索与观看平台`,
            `/`
        );
        // 更新页面标题
        document.title = `LibreTV - 免费在线视频搜索与观看平台`;
    } catch (e) {
        console.error('更新浏览器历史失败:', e);
    }
}

// 获取自定义API信息
function getCustomApiInfo(customApiIndex) {
    const index = parseInt(customApiIndex);
    if (isNaN(index) || index < 0 || index >= customAPIs.length) {
        return null;
    }
    return customAPIs[index];
}

async function search() {
    // 强化的密码保护校验 - 防止绕过
    try {
        if (window.ensurePasswordProtection) {
            window.ensurePasswordProtection();
        } else {
            // 兼容性检查
            if (window.isPasswordProtected && window.isPasswordVerified) {
                if (window.isPasswordProtected() && !window.isPasswordVerified()) {
                    showPasswordModal && showPasswordModal();
                    return;
                }
            }
        }
    } catch (error) {
        console.warn('Password protection check failed:', error.message);
        return;
    }
    const query = document.getElementById('searchInput').value.trim();

    if (!query) {
        showToast('请输入搜索内容', 'info');
        return;
    }

    if (selectedAPIs.length === 0) {
        showToast('请至少选择一个API源', 'warning');
        return;
    }

    showLoading();

    try {
        // 保存搜索历史
        saveSearchHistory(query);

        // 从所有选中的API源搜索
        let allResults = [];
        const searchPromises = selectedAPIs.map(apiId => 
            searchByAPIAndKeyWord(apiId, query)
        );

        // 等待所有搜索请求完成
        const resultsArray = await Promise.all(searchPromises);

        // 合并所有结果并进行严格源内与全局唯一性去重
        const seenGlobalKeys = new Set();
        resultsArray.forEach(results => {
            if (Array.isArray(results) && results.length > 0) {
                results.forEach(item => {
                    if (!item) return;
                    const srcKey = item.source_code || item.source_name || 'unknown_src';
                    const vidKey = item.vod_id ? String(item.vod_id) : (item.vod_name || '');
                    const uniqueKey = `${srcKey}##${vidKey}`;
                    if (!seenGlobalKeys.has(uniqueKey)) {
                        seenGlobalKeys.add(uniqueKey);
                        allResults.push(item);
                    }
                });
            }
        });

        // 处理搜索结果过滤：如果启用了黄色内容过滤，则过滤掉分类含有敏感内容的项目
        const yellowFilterEnabled = localStorage.getItem('yellowFilterEnabled') === 'true';
        if (yellowFilterEnabled) {
            const banned = ['伦理片', '福利', '里番动漫', '门事件', '萝莉少女', '制服诱惑', '国产传媒', 'cosplay', '黑丝诱惑', '无码', '日本无码', '有码', '日本有码', 'SWAG', '网红主播', '色情片', '同性片', '福利视频', '福利片'];
            allResults = allResults.filter(item => {
                const typeName = item.type_name || '';
                return !banned.some(keyword => typeName.includes(keyword));
            });
        }

        // 计算匹配度相关性、画质等级、延迟与智能综合评分
        const cleanQuery = query.trim();
        allResults.forEach(item => {
            const relevance = (typeof window.calculateRelevance === 'function')
                ? window.calculateRelevance(cleanQuery, item.vod_name)
                : 100;
            const quality = (typeof window.detectVideoQuality === 'function')
                ? window.detectVideoQuality(item)
                : { tag: null, color: '', scoreBonus: 0 };
            const latency = item.source_latency || 800;

            // 长度精准度惩罚：片名越贴近原名越靠前（避免冗长解说/衍生片霸屏）
            const qLen = cleanQuery.replace(/[\s\-_]/g, '').length;
            const tLen = (item.vod_name || '').trim().replace(/[\s\-_]/g, '').length;
            const lenDiff = Math.abs(tLen - qLen);
            const lengthPenalty = Math.min(lenDiff * 1.5, 20);

            // 延迟惩罚：延迟 300ms 扣 3分，1500ms 扣 15分（上限 20分）
            const latencyPenalty = Math.min(latency / 100, 20);

            item.relevanceScore = relevance;
            item.qualityInfo = quality;
            // 综合打分：匹配度占主导 (10倍权重)，4K/1080P 高画质优先加成，低延迟优先，枪版/预告片大幅降权
            item.totalScore = (relevance * 10) + (quality.scoreBonus || 0) - lengthPenalty - latencyPenalty;
        });

        // 过滤无关噪音：剔除匹配度 < 60 分的单字孤立项（彻底杜绝搜“择天记”出现“老友记”、“记住这一天”等垃圾结果）
        let filteredResults = allResults.filter(item => (item.relevanceScore || 0) >= 60);

        // 安全兜底保护：若严格过滤后无结果，但原列表存在部分重合项，则放宽回退，避免生僻词误杀
        if (filteredResults.length === 0 && allResults.length > 0) {
            const partialResults = allResults.filter(item => (item.relevanceScore || 0) > 0);
            filteredResults = partialResults.length > 0 ? partialResults : allResults;
        }
        allResults = filteredResults;

        // 对搜索结果进行智能排序：优先按综合得分降序（高匹配度、4K/超清高画质、低延迟排在最前）
        allResults.sort((a, b) => {
            if (b.totalScore !== a.totalScore) {
                return b.totalScore - a.totalScore;
            }
            // 综合得分相同时，响应速度更快的源排在前面
            const latA = a.source_latency || 9999;
            const latB = b.source_latency || 9999;
            if (latA !== latB) {
                return latA - latB;
            }
            // 仍然相同时按照片名升序
            return (a.vod_name || '').localeCompare(b.vod_name || '');
        });

        // 更新搜索结果计数
        const searchResultsCount = document.getElementById('searchResultsCount');
        if (searchResultsCount) {
            searchResultsCount.textContent = allResults.length;
        }

        // 显示结果区域，调整搜索区域
        document.getElementById('searchArea').classList.remove('flex-1');
        document.getElementById('searchArea').classList.add('mb-8');
        document.getElementById('resultsArea').classList.remove('hidden');

        // 隐藏豆瓣推荐区域（如果存在）
        const doubanArea = document.getElementById('doubanArea');
        if (doubanArea) {
            doubanArea.classList.add('hidden');
        }

        const resultsDiv = document.getElementById('results');

        // 如果没有结果
        if (!allResults || allResults.length === 0) {
            resultsDiv.innerHTML = `
                <div class="col-span-full text-center py-16">
                    <svg class="mx-auto h-12 w-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 class="mt-2 text-lg font-medium text-gray-400">没有找到匹配的结果</h3>
                    <p class="mt-1 text-sm text-gray-500">请尝试其他关键词或更换数据源</p>
                </div>
            `;
            hideLoading();
            return;
        }

        // 有搜索结果时，才更新URL
        try {
            // 使用URI编码确保特殊字符能够正确显示
            const encodedQuery = encodeURIComponent(query);
            // 使用HTML5 History API更新URL，不刷新页面
            window.history.pushState(
                { search: query },
                `搜索: ${query} - LibreTV`,
                `/s=${encodedQuery}`
            );
            // 更新页面标题
            document.title = `搜索: ${query} - LibreTV`;
        } catch (e) {
            console.error('更新浏览器历史失败:', e);
            // 如果更新URL失败，继续执行搜索
        }

        // 添加XSS保护，使用textContent和属性转义
        const safeResults = allResults.map(item => {
            const safeId = item.vod_id ? item.vod_id.toString().replace(/[^\w-]/g, '') : '';
            const safeName = (item.vod_name || '').toString()
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');
            const sourceInfo = item.source_name ?
                `<span class="bg-[#222] text-xs px-1.5 py-0.5 rounded-full">${item.source_name}</span>` : '';
            const sourceCode = item.source_code || '';

            // 添加API URL属性，用于详情获取
            const apiUrlAttr = item.api_url ?
                `data-api-url="${item.api_url.replace(/"/g, '&quot;')}"` : '';

            // 修改为水平卡片布局，图片在左侧，文本在右侧，并优化样式
            const hasCover = item.vod_pic && item.vod_pic.startsWith('http');
            const qualityTagHtml = (item.qualityInfo && item.qualityInfo.tag) ?
                `<span class="px-1.5 py-0.5 rounded text-[10px] ${item.qualityInfo.color}">${item.qualityInfo.tag}</span>` : '';
            const latencyBadgeHtml = (typeof window.formatLatencyBadge === 'function') ?
                window.formatLatencyBadge(item.source_latency) : '';

            return `
                <div class="card-hover bg-[#111] rounded-lg overflow-hidden cursor-pointer transition-all hover:scale-[1.02] h-full shadow-sm hover:shadow-md" 
                     onclick="showDetails('${safeId}','${safeName}','${sourceCode}')" ${apiUrlAttr}>
                    <div class="flex h-full">
                        ${hasCover ? `
                        <div class="relative flex-shrink-0 search-card-img-container">
                            <img src="${item.vod_pic}" alt="${safeName}" 
                                 class="h-full w-full object-cover transition-transform hover:scale-110" 
                                 onerror="this.onerror=null; this.src='https://via.placeholder.com/300x450?text=无封面'; this.classList.add('object-contain');" 
                                 loading="lazy">
                            <div class="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent"></div>
                            ${qualityTagHtml ? `
                            <div class="absolute top-1.5 left-1.5 z-10">
                                ${qualityTagHtml}
                            </div>` : ''}
                        </div>` : ''}
                        
                        <div class="p-2 flex flex-col flex-grow">
                            <div class="flex-grow">
                                <div class="flex items-start justify-between gap-1 mb-1.5">
                                    <h3 class="font-semibold break-words line-clamp-2 ${hasCover ? '' : 'text-center flex-grow'}" title="${safeName}">${safeName}</h3>
                                    ${!hasCover && qualityTagHtml ? `<div class="flex-shrink-0">${qualityTagHtml}</div>` : ''}
                                </div>
                                
                                <div class="flex flex-wrap ${hasCover ? '' : 'justify-center'} gap-1 mb-2">
                                    ${(item.type_name || '').toString().replace(/</g, '&lt;') ?
                    `<span class="text-xs py-0.5 px-1.5 rounded bg-opacity-20 bg-blue-500 text-blue-300">
                                          ${(item.type_name || '').toString().replace(/</g, '&lt;')}
                                      </span>` : ''}
                                    ${(item.vod_year || '') ?
                    `<span class="text-xs py-0.5 px-1.5 rounded bg-opacity-20 bg-purple-500 text-purple-300">
                                          ${item.vod_year}
                                      </span>` : ''}
                                </div>
                                <p class="text-gray-400 line-clamp-2 overflow-hidden ${hasCover ? '' : 'text-center'} mb-2">
                                    ${(item.vod_remarks || '暂无介绍').toString().replace(/</g, '&lt;')}
                                </p>
                            </div>
                            
                            <div class="flex justify-between items-center mt-1 pt-1 border-t border-gray-800">
                                ${sourceInfo ? `<div>${sourceInfo}</div>` : '<div></div>'}
                                <div>${latencyBadgeHtml}</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        resultsDiv.innerHTML = safeResults;
    } catch (error) {
        console.error('搜索错误:', error);
        if (error.name === 'AbortError') {
            showToast('搜索请求超时，请检查网络连接', 'error');
        } else {
            showToast('搜索请求失败，请稍后重试', 'error');
        }
    } finally {
        hideLoading();
    }
}

// 切换清空按钮的显示状态
function toggleClearButton() {
    const searchInput = document.getElementById('searchInput');
    const clearButton = document.getElementById('clearSearchInput');
    if (searchInput.value !== '') {
        clearButton.classList.remove('hidden');
    } else {
        clearButton.classList.add('hidden');
    }
}

// 清空搜索框内容
function clearSearchInput() {
    const searchInput = document.getElementById('searchInput');
    searchInput.value = '';
    const clearButton = document.getElementById('clearSearchInput');
    clearButton.classList.add('hidden');
}

// 劫持搜索框的value属性以检测外部修改
function hookInput() {
    const input = document.getElementById('searchInput');
    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');

    // 重写 value 属性的 getter 和 setter
    Object.defineProperty(input, 'value', {
        get: function () {
            // 确保读取时返回字符串（即使原始值为 undefined/null）
            const originalValue = descriptor.get.call(this);
            return originalValue != null ? String(originalValue) : '';
        },
        set: function (value) {
            // 显式将值转换为字符串后写入
            const strValue = String(value);
            descriptor.set.call(this, strValue);
            this.dispatchEvent(new Event('input', { bubbles: true }));
        }
    });

    // 初始化输入框值为空字符串（避免初始值为 undefined）
    input.value = '';
}
document.addEventListener('DOMContentLoaded', hookInput);

// 显示详情 - 修改为支持自定义API
async function showDetails(id, vod_name, sourceCode) {
    // 密码保护校验
    if (window.isPasswordProtected && window.isPasswordVerified) {
        if (window.isPasswordProtected() && !window.isPasswordVerified()) {
            showPasswordModal && showPasswordModal();
            return;
        }
    }
    if (!id) {
        showToast('视频ID无效', 'error');
        return;
    }

    showLoading();
    try {
        // 构建API参数
        let apiParams = '';

        // 处理自定义API源
        if (sourceCode.startsWith('custom_')) {
            const customIndex = sourceCode.replace('custom_', '');
            const customApi = getCustomApiInfo(customIndex);
            if (!customApi) {
                showToast('自定义API配置无效', 'error');
                hideLoading();
                return;
            }
            // 传递 detail 与 customName
            const customNameParam = '&customName=' + encodeURIComponent(customApi.name);
            if (customApi.detail) {
                apiParams = '&customApi=' + encodeURIComponent(customApi.url) + '&customDetail=' + encodeURIComponent(customApi.detail) + customNameParam + '&source=custom';
            } else {
                apiParams = '&customApi=' + encodeURIComponent(customApi.url) + customNameParam + '&source=custom';
            }
        } else {
            // 内置API
            apiParams = '&source=' + sourceCode;
        }

        // Add a timestamp to prevent caching
        const timestamp = new Date().getTime();
        const cacheBuster = `&_t=${timestamp}`;
        const response = await fetch(`/api/detail?id=${encodeURIComponent(id)}${apiParams}${cacheBuster}`);

        const data = await response.json();

        const modal = document.getElementById('modal');
        const modalTitle = document.getElementById('modalTitle');
        const modalContent = document.getElementById('modalContent');

        // 显示来源信息
        const sourceName = data.videoInfo && data.videoInfo.source_name ?
            ` <span class="text-sm font-normal text-gray-400">(${data.videoInfo.source_name})</span>` : '';

        // 不对标题进行截断处理，允许完整显示
        modalTitle.innerHTML = `<span class="break-words">${vod_name || '未知视频'}</span>${sourceName}`;
        currentVideoTitle = vod_name || '未知视频';

        // 处理多线路与剧集命名
        currentRoutes = data.routes || [];
        currentActiveRouteIndex = 0;
        if (currentRoutes.length > 0 && currentRoutes[0].episodes) {
            currentEpisodes = currentRoutes[0].episodes.map(e => e.url);
            currentEpisodeNames = currentRoutes[0].episodes.map(e => e.name);
        } else {
            currentEpisodes = data.episodes;
            currentEpisodeNames = [];
        }
        currentEpisodeIndex = 0;

        // 构建多线路切换栏
        let routeSwitcherHtml = '';
        if (currentRoutes.length > 1) {
            routeSwitcherHtml = `
                <div class="mb-3 p-2 bg-[#181818] rounded-lg border border-[#252525]">
                    <div class="text-xs text-gray-400 mb-1.5 flex items-center">
                        <svg class="w-3.5 h-3.5 mr-1 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                        </svg>
                        <span>播放线路切换:</span>
                    </div>
                    <div class="flex flex-wrap gap-1.5">
                        ${currentRoutes.map((r, rIdx) => `
                            <button onclick="switchPlayRoute(${rIdx}, '${(vod_name || '').replace(/'/g, "\\'")}', '${sourceCode}', '${id}')" 
                                    id="route-btn-${rIdx}"
                                    class="route-tab-btn px-2.5 py-1 rounded text-xs transition-all ${rIdx === 0 ? 'bg-blue-600 text-white font-medium shadow' : 'bg-[#222] hover:bg-[#333] text-gray-300'}">
                                ${r.name || `线路 ${rIdx + 1}`} <span class="text-[10px] opacity-75">(${r.episodes.length}集)</span>
                            </button>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        if (data.episodes && data.episodes.length > 0) {
            // 构建详情信息HTML
            let detailInfoHtml = '';
            if (data.videoInfo) {
                // Prepare description text, strip HTML and trim whitespace
                const descriptionText = data.videoInfo.desc ? data.videoInfo.desc.replace(/<[^>]+>/g, '').trim() : '';

                // Check if there's any actual grid content
                const hasGridContent = data.videoInfo.type || data.videoInfo.year || data.videoInfo.area || data.videoInfo.director || data.videoInfo.actor || data.videoInfo.remarks;

                if (hasGridContent || descriptionText) { // Only build if there's something to show
                    detailInfoHtml = `
                <div class="modal-detail-info">
                    ${hasGridContent ? `
                    <div class="detail-grid">
                        ${data.videoInfo.type ? `<div class="detail-item"><span class="detail-label">类型:</span> <span class="detail-value">${data.videoInfo.type}</span></div>` : ''}
                        ${data.videoInfo.year ? `<div class="detail-item"><span class="detail-label">年份:</span> <span class="detail-value">${data.videoInfo.year}</span></div>` : ''}
                        ${data.videoInfo.area ? `<div class="detail-item"><span class="detail-label">地区:</span> <span class="detail-value">${data.videoInfo.area}</span></div>` : ''}
                        ${data.videoInfo.director ? `<div class="detail-item"><span class="detail-label">导演:</span> <span class="detail-value">${data.videoInfo.director}</span></div>` : ''}
                        ${data.videoInfo.actor ? `<div class="detail-item"><span class="detail-label">主演:</span> <span class="detail-value">${data.videoInfo.actor}</span></div>` : ''}
                        ${data.videoInfo.remarks ? `<div class="detail-item"><span class="detail-label">备注:</span> <span class="detail-value">${data.videoInfo.remarks}</span></div>` : ''}
                    </div>` : ''}
                    ${descriptionText ? `
                    <div class="detail-desc">
                        <p class="detail-label">简介:</p>
                        <p class="detail-desc-content">${descriptionText}</p>
                    </div>` : ''}
                </div>
                `;
                }
            }

            modalContent.innerHTML = `
                ${detailInfoHtml}
                ${routeSwitcherHtml}
                <div class="flex flex-wrap items-center justify-between mb-4 gap-2">
                    <div class="flex items-center gap-2">
                        <button onclick="toggleEpisodeOrder('${sourceCode}', '${id}')" 
                                class="px-3 py-1.5 bg-[#333] hover:bg-[#444] border border-[#444] rounded text-sm transition-colors flex items-center gap-1">
                            <svg class="w-4 h-4 transform ${episodesReversed ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
                            </svg>
                            <span>${episodesReversed ? '正序排列' : '倒序排列'}</span>
                        </button>
                        <span class="text-gray-400 text-sm">共 ${data.episodes.length} 集</span>
                    </div>
                    <button onclick="copyLinks()" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors">
                        复制链接
                    </button>
                </div>
                <div id="episodesGrid" class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                    ${renderEpisodes(vod_name, sourceCode, id)}
                </div>
            `;
        } else {
            modalContent.innerHTML = `
                <div class="text-center py-8">
                    <div class="text-red-400 mb-2">❌ 未找到播放资源</div>
                    <div class="text-gray-500 text-sm">该视频可能暂时无法播放，请尝试其他视频</div>
                </div>
            `;
        }

        modal.classList.remove('hidden');
    } catch (error) {
        console.error('获取详情错误:', error);
        showToast('获取详情失败，请稍后重试', 'error');
    } finally {
        hideLoading();
    }
}

// 线路切换函数
function switchPlayRoute(routeIndex, vodName, sourceCode, vodId) {
    if (!currentRoutes || !currentRoutes[routeIndex]) return;
    currentActiveRouteIndex = routeIndex;
    const targetRoute = currentRoutes[routeIndex];
    currentEpisodes = targetRoute.episodes.map(e => e.url);
    currentEpisodeNames = targetRoute.episodes.map(e => e.name);
    currentEpisodeIndex = 0;

    // 更新各线路按钮的样式
    document.querySelectorAll('.route-tab-btn').forEach((btn, i) => {
        if (i === routeIndex) {
            btn.className = 'route-tab-btn px-2.5 py-1 rounded text-xs transition-all bg-blue-600 text-white font-medium shadow';
        } else {
            btn.className = 'route-tab-btn px-2.5 py-1 rounded text-xs transition-all bg-[#222] hover:bg-[#333] text-gray-300';
        }
    });

    // 更新剧集总数显示
    const countEl = document.getElementById('routeEpisodeCount');
    if (countEl) {
        countEl.textContent = `共 ${currentEpisodes.length} 集`;
    }

    // 重新渲染剧集列表
    const grid = document.getElementById('episodesGrid');
    if (grid) {
        grid.innerHTML = renderEpisodes(vodName || currentVideoTitle, sourceCode, vodId);
    }
}

// 辅助函数用于渲染剧集按钮（使用当前的排序状态，支持展示剧集真实名称）
function renderEpisodes(vodName, sourceCode, vodId) {
    const episodes = episodesReversed ? [...currentEpisodes].reverse() : currentEpisodes;
    const names = currentEpisodeNames && currentEpisodeNames.length === currentEpisodes.length
        ? (episodesReversed ? [...currentEpisodeNames].reverse() : currentEpisodeNames)
        : null;

    return episodes.map((episode, index) => {
        // 根据倒序状态计算真实的剧集索引
        const realIndex = episodesReversed ? currentEpisodes.length - 1 - index : index;
        const displayName = (names && names[index]) ? names[index] : (realIndex + 1);
        return `
            <button id="episode-${realIndex}" onclick="playVideo('${episode}','${(vodName || '').replace(/"/g, '&quot;')}', '${sourceCode}', ${realIndex}, '${vodId}')" 
                    class="px-2.5 py-2 bg-[#222] hover:bg-[#333] border border-[#333] rounded-lg transition-colors text-center text-xs truncate episode-btn"
                    title="${displayName}">
                ${displayName}
            </button>
        `;
    }).join('');
}

// 更新播放视频函数，修改为使用/watch路径而不是直接打开player.html
function playVideo(url, vod_name, sourceCode, episodeIndex = 0, vodId = '') {
    // 密码保护校验
    if (window.isPasswordProtected && window.isPasswordVerified) {
        if (window.isPasswordProtected() && !window.isPasswordVerified()) {
            showPasswordModal && showPasswordModal();
            return;
        }
    }

    // 获取当前路径作为返回页面
    let currentPath = window.location.href;

    // 构建播放页面URL，使用watch.html作为中间跳转页
    let watchUrl = `watch.html?id=${vodId || ''}&source=${sourceCode || ''}&url=${encodeURIComponent(url)}&index=${episodeIndex}&title=${encodeURIComponent(vod_name || '')}`;

    // 添加返回URL参数
    if (currentPath.includes('index.html') || currentPath.endsWith('/')) {
        watchUrl += `&back=${encodeURIComponent(currentPath)}`;
    }

    // 保存当前状态到localStorage
    try {
        localStorage.setItem('currentVideoTitle', vod_name || '未知视频');
        localStorage.setItem('currentEpisodes', JSON.stringify(currentEpisodes));
        localStorage.setItem('currentEpisodeIndex', episodeIndex);
        localStorage.setItem('currentSourceCode', sourceCode || '');
        localStorage.setItem('lastPlayTime', Date.now());
        localStorage.setItem('lastSearchPage', currentPath);
        localStorage.setItem('lastPageUrl', currentPath);  // 确保保存返回页面URL
    } catch (e) {
        console.error('保存播放状态失败:', e);
    }

    // 在当前标签页中打开播放页面
    window.location.href = watchUrl;
}

// 弹出播放器页面
function showVideoPlayer(url) {
    // 在打开播放器前，隐藏详情弹窗
    const detailModal = document.getElementById('modal');
    if (detailModal) {
        detailModal.classList.add('hidden');
    }
    // 临时隐藏搜索结果和豆瓣区域，防止高度超出播放器而出现滚动条
    document.getElementById('resultsArea').classList.add('hidden');
    document.getElementById('doubanArea').classList.add('hidden');
    // 在框架中打开播放页面
    videoPlayerFrame = document.createElement('iframe');
    videoPlayerFrame.id = 'VideoPlayerFrame';
    videoPlayerFrame.className = 'fixed w-full h-screen z-40';
    videoPlayerFrame.src = url;
    document.body.appendChild(videoPlayerFrame);
    // 将焦点移入iframe
    videoPlayerFrame.focus();
}

// 关闭播放器页面
function closeVideoPlayer(home = false) {
    videoPlayerFrame = document.getElementById('VideoPlayerFrame');
    if (videoPlayerFrame) {
        videoPlayerFrame.remove();
        // 恢复搜索结果显示
        document.getElementById('resultsArea').classList.remove('hidden');
        // 关闭播放器时也隐藏详情弹窗
        const detailModal = document.getElementById('modal');
        if (detailModal) {
            detailModal.classList.add('hidden');
        }
        // 如果启用豆瓣区域则显示豆瓣区域
        if (localStorage.getItem('doubanEnabled') === 'true') {
            document.getElementById('doubanArea').classList.remove('hidden');
        }
    }
    if (home) {
        // 刷新主页
        window.location.href = '/'
    }
}

// 播放上一集
function playPreviousEpisode(sourceCode) {
    if (currentEpisodeIndex > 0) {
        const prevIndex = currentEpisodeIndex - 1;
        const prevUrl = currentEpisodes[prevIndex];
        playVideo(prevUrl, currentVideoTitle, sourceCode, prevIndex);
    }
}

// 播放下一集
function playNextEpisode(sourceCode) {
    if (currentEpisodeIndex < currentEpisodes.length - 1) {
        const nextIndex = currentEpisodeIndex + 1;
        const nextUrl = currentEpisodes[nextIndex];
        playVideo(nextUrl, currentVideoTitle, sourceCode, nextIndex);
    }
}

// 处理播放器加载错误
function handlePlayerError() {
    hideLoading();
    showToast('视频播放加载失败，请尝试其他视频源', 'error');
}

// 复制视频链接到剪贴板
function copyLinks() {
    const episodes = episodesReversed ? [...currentEpisodes].reverse() : currentEpisodes;
    const linkList = episodes.join('\r\n');
    navigator.clipboard.writeText(linkList).then(() => {
        showToast('播放链接已复制', 'success');
    }).catch(err => {
        showToast('复制失败，请检查浏览器权限', 'error');
    });
}

// 切换排序状态的函数
function toggleEpisodeOrder(sourceCode, vodId) {
    episodesReversed = !episodesReversed;
    // 重新渲染剧集区域，使用 currentVideoTitle 作为视频标题
    const episodesGrid = document.getElementById('episodesGrid');
    if (episodesGrid) {
        episodesGrid.innerHTML = renderEpisodes(currentVideoTitle, sourceCode, vodId);
    }

    // 更新按钮文本和箭头方向
    const toggleBtn = document.querySelector(`button[onclick="toggleEpisodeOrder('${sourceCode}', '${vodId}')"]`);
    if (toggleBtn) {
        toggleBtn.querySelector('span').textContent = episodesReversed ? '正序排列' : '倒序排列';
        const arrowIcon = toggleBtn.querySelector('svg');
        if (arrowIcon) {
            arrowIcon.style.transform = episodesReversed ? 'rotate(180deg)' : 'rotate(0deg)';
        }
    }
}

// 从URL导入配置
async function importConfigFromUrl() {
    // 创建模态框元素
    let modal = document.getElementById('importUrlModal');
    if (modal) {
        document.body.removeChild(modal);
    }

    modal = document.createElement('div');
    modal.id = 'importUrlModal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-40';

    modal.innerHTML = `
        <div class="bg-[#191919] rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto relative">
            <button id="closeUrlModal" class="absolute top-4 right-4 text-gray-400 hover:text-white text-xl">&times;</button>
            
            <h3 class="text-xl font-bold mb-4">从URL导入配置</h3>
            
            <div class="mb-4">
                <input type="text" id="configUrl" placeholder="输入配置文件URL" 
                       class="w-full px-3 py-2 bg-[#222] border border-[#333] rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-blue-500">
            </div>
            
            <div class="flex justify-end space-x-2">
                <button id="confirmUrlImport" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">导入</button>
                <button id="cancelUrlImport" class="bg-[#444] hover:bg-[#555] text-white px-4 py-2 rounded">取消</button>
            </div>
        </div>`;

    document.body.appendChild(modal);

    // 关闭按钮事件
    document.getElementById('closeUrlModal').addEventListener('click', () => {
        document.body.removeChild(modal);
    });

    // 取消按钮事件
    document.getElementById('cancelUrlImport').addEventListener('click', () => {
        document.body.removeChild(modal);
    });

    // 确认导入按钮事件
    document.getElementById('confirmUrlImport').addEventListener('click', async () => {
        const url = document.getElementById('configUrl').value.trim();
        if (!url) {
            showToast('请输入配置文件URL', 'warning');
            return;
        }

        // 验证URL格式
        try {
            const urlObj = new URL(url);
            if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
                showToast('URL必须以http://或https://开头', 'warning');
                return;
            }
        } catch (e) {
            showToast('URL格式不正确', 'warning');
            return;
        }

        showLoading('正在从URL导入配置...');

        try {
            // 获取配置文件 - 直接请求URL
            const response = await fetch(url, {
                mode: 'cors',
                headers: {
                    'Accept': 'application/json'
                }
            });
            if (!response.ok) throw '获取配置文件失败';

            // 验证响应内容类型
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw '响应不是有效的JSON格式';
            }

            const config = await response.json();
            if (config.name !== 'LibreTV-Settings') throw '配置文件格式不正确';

            // 验证哈希
            const dataHash = await sha256(JSON.stringify(config.data));
            if (dataHash !== config.hash) throw '配置文件哈希值不匹配';

            // 导入配置
            for (let item in config.data) {
                localStorage.setItem(item, config.data[item]);
            }

            showToast('配置文件导入成功，3 秒后自动刷新本页面。', 'success');
            setTimeout(() => {
                window.location.reload();
            }, 3000);
        } catch (error) {
            const message = typeof error === 'string' ? error : '导入配置失败';
            showToast(`从URL导入配置出错 (${message})`, 'error');
        } finally {
            hideLoading();
            document.body.removeChild(modal);
        }
    });

    // 点击模态框外部关闭
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
}

// 配置文件导入功能
async function importConfig() {
    showImportBox(async (file) => {
        try {
            // 检查文件类型
            if (!(file.type === 'application/json' || file.name.endsWith('.json'))) throw '文件类型不正确';

            // 检查文件大小
            if (file.size > 1024 * 1024 * 10) throw new Error('文件大小超过 10MB');

            // 读取文件内容
            const content = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => reject('文件读取失败');
                reader.readAsText(file);
            });

            // 解析并验证配置
            const config = JSON.parse(content);
            if (config.name !== 'LibreTV-Settings') throw '配置文件格式不正确';

            // 验证哈希
            const dataHash = await sha256(JSON.stringify(config.data));
            if (dataHash !== config.hash) throw '配置文件哈希值不匹配';

            // 导入配置
            for (let item in config.data) {
                localStorage.setItem(item, config.data[item]);
            }

            showToast('配置文件导入成功，3 秒后自动刷新本页面。', 'success');
            setTimeout(() => {
                window.location.reload();
            }, 3000);
        } catch (error) {
            const message = typeof error === 'string' ? error : '配置文件格式错误';
            showToast(`配置文件读取出错 (${message})`, 'error');
        }
    });
}

// 配置文件导出功能
async function exportConfig() {
    // 存储配置数据
    const config = {};
    const items = {};

    const settingsToExport = [
        'selectedAPIs',
        'customAPIs',
        'yellowFilterEnabled',
        'adFilteringEnabled',
        'doubanEnabled',
        'hasInitializedDefaults'
    ];

    // 导出设置项
    settingsToExport.forEach(key => {
        const value = localStorage.getItem(key);
        if (value !== null) {
            items[key] = value;
        }
    });

    // 导出历史记录
    const viewingHistory = localStorage.getItem('viewingHistory');
    if (viewingHistory) {
        items['viewingHistory'] = viewingHistory;
    }

    const searchHistory = localStorage.getItem(SEARCH_HISTORY_KEY);
    if (searchHistory) {
        items[SEARCH_HISTORY_KEY] = searchHistory;
    }

    const times = Date.now().toString();
    config['name'] = 'LibreTV-Settings';  // 配置文件名，用于校验
    config['time'] = times;               // 配置文件生成时间
    config['cfgVer'] = '1.0.0';           // 配置文件版本
    config['data'] = items;               // 配置文件数据
    config['hash'] = await sha256(JSON.stringify(config['data']));  // 计算数据的哈希值，用于校验

    // 将配置数据保存为 JSON 文件
    saveStringAsFile(JSON.stringify(config), 'LibreTV-Settings_' + times + '.json');
}

// 将字符串保存为文件
function saveStringAsFile(content, fileName) {
    // 创建Blob对象并指定类型
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    // 生成临时URL
    const url = window.URL.createObjectURL(blob);
    // 创建<a>标签并触发下载
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    // 清理临时对象
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

// 移除Node.js的require语句，因为这是在浏览器环境中运行的

// ==========================================
// TVBox 接口导入与管理交互逻辑 (Cloudflare Pages 原生支持)
// ==========================================

function openTvboxModal() {
    const modal = document.getElementById('tvboxModal');
    if (modal) {
        modal.classList.remove('hidden');
        switchTvboxTab('url');
    }
}

function closeTvboxModal() {
    const modal = document.getElementById('tvboxModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function switchTvboxTab(tabName) {
    const tabs = ['url', 'json', 'builtin'];
    tabs.forEach(t => {
        const pane = document.getElementById(`tvboxTab${t.charAt(0).toUpperCase() + t.slice(1)}`);
        const btn = document.getElementById(`tabBtn${t.charAt(0).toUpperCase() + t.slice(1)}`);
        if (pane) {
            if (t === tabName) {
                pane.classList.remove('hidden');
            } else {
                pane.classList.add('hidden');
            }
        }
        if (btn) {
            if (t === tabName) {
                btn.className = 'px-3 py-1.5 rounded-lg bg-blue-600 text-white font-medium transition-colors';
            } else {
                btn.className = 'px-3 py-1.5 rounded-lg bg-[#222] text-gray-400 hover:text-white transition-colors';
            }
        }
    });
}

function showTvboxStatus(msg, type = 'info') {
    const el = document.getElementById('tvboxStatusMsg');
    if (!el) return;
    el.classList.remove('hidden', 'bg-blue-900/40', 'text-blue-300', 'bg-red-900/40', 'text-red-300', 'bg-green-900/40', 'text-green-300', 'border-blue-700/50', 'border-red-700/50', 'border-green-700/50');
    if (type === 'error') {
        el.classList.add('bg-red-900/40', 'text-red-300', 'border', 'border-red-700/50');
    } else if (type === 'success') {
        el.classList.add('bg-green-900/40', 'text-green-300', 'border', 'border-green-700/50');
    } else {
        el.classList.add('bg-blue-900/40', 'text-blue-300', 'border', 'border-blue-700/50');
    }
    el.innerHTML = msg;
}

async function parseTvboxFromUrl(targetUrlOverride) {
    const input = document.getElementById('tvboxUrlInput');
    const url = targetUrlOverride || (input ? input.value.trim() : '');
    if (!url) {
        showToast('请输入有效的 TVBox 订阅 URL', 'warning');
        return;
    }

    if (targetUrlOverride && input) {
        input.value = targetUrlOverride;
    }

    const btn = document.getElementById('btnFetchTvbox');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="inline-block animate-spin mr-1">↻</span> 正在拉取...';
    }
    showTvboxStatus('正在通过边缘代理拉取订阅配置...', 'info');

    try {
        const result = await window.TVBox.fetchAndParseUrl(url);
        
        const multiArea = document.getElementById('tvboxMultiWarehouseArea');
        const select = document.getElementById('tvboxWarehouseSelect');
        const badge = document.getElementById('tvboxWarehouseCountBadge');

        // 如果是多仓聚合
        if (result.isMultiWarehouse) {
            if (multiArea && select) {
                multiArea.classList.remove('hidden');
                if (badge) badge.textContent = `检测到多仓聚合订阅（共 ${result.warehouses.length} 条线路）`;
                select.innerHTML = result.warehouses.map((w, idx) => `
                    <option value="${encodeURIComponent(w.url)}">${w.name || ('线路 ' + (idx + 1))}</option>
                `).join('');
            }
            showTvboxStatus(`解析成功！检测到多仓聚合（包含 ${result.warehouses.length} 条线路），请在下方下拉菜单中选择线路载入源。`, 'success');
            // 默认自动拉取第一条线路
            if (result.warehouses.length > 0 && !targetUrlOverride) {
                loadSelectedWarehouseLine();
            }
            return;
        }

        // 单仓或已解析完成
        if (multiArea && !targetUrlOverride) {
            multiArea.classList.add('hidden');
        }

        renderTvboxSitesPreview(result);
        if (result.compatibleSites.length > 0) {
            showTvboxStatus(`解析成功！共识别出 ${result.compatibleSites.length} 个兼容源${result.incompatibleSites.length ? `（已自动过滤 ${result.incompatibleSites.length} 个 Dex Jar 爬虫）` : ''}`, 'success');
        } else {
            showTvboxStatus(`解析完成：此订阅中未发现网页直接兼容的 CMS 源${result.incompatibleSites.length ? `（已过滤 ${result.incompatibleSites.length} 个 Dex Jar 爬虫）` : ''}`, 'info');
        }
    } catch (e) {
        console.error('拉取 TVBox 订阅失败:', e);
        showTvboxStatus(`拉取失败: ${e.message}`, 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<span>拉取并解析</span>';
        }
    }
}

// 载入选中的多仓子线路
async function loadSelectedWarehouseLine() {
    const select = document.getElementById('tvboxWarehouseSelect');
    if (!select || !select.value) return;
    const subUrl = decodeURIComponent(select.value);
    const btn = document.getElementById('btnLoadWarehouse');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '载入中...';
    }
    showTvboxStatus(`正在载入选中的多仓线路: ${select.options[select.selectedIndex]?.text || ''}...`, 'info');

    try {
        const result = await window.TVBox.fetchAndParseUrl(subUrl);
        renderTvboxSitesPreview(result);
        if (result.compatibleSites.length > 0) {
            showTvboxStatus(`线路载入成功！共识别出 ${result.compatibleSites.length} 个兼容源${result.incompatibleSites.length ? `（已自动过滤 ${result.incompatibleSites.length} 个 Dex Jar 爬虫）` : ''}`, 'success');
        } else {
            showTvboxStatus(`线路载入完成：该线路无网页兼容源${result.incompatibleSites.length ? `（已跳过 ${result.incompatibleSites.length} 个 Dex Jar 爬虫）` : ''}`, 'info');
        }
    } catch (e) {
        showTvboxStatus(`载入线路失败: ${e.message}`, 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '载入此线路';
        }
    }
}

function parseTvboxFromJsonText() {
    const textarea = document.getElementById('tvboxJsonInput');
    const text = textarea ? textarea.value.trim() : '';
    if (!text) {
        showToast('请粘贴 TVBox 配置 JSON 或 Base64 文本', 'warning');
        return;
    }

    try {
        const result = window.TVBox.parseConfigText(text);
        if (result.isMultiWarehouse) {
            const multiArea = document.getElementById('tvboxMultiWarehouseArea');
            const select = document.getElementById('tvboxWarehouseSelect');
            const badge = document.getElementById('tvboxWarehouseCountBadge');
            if (multiArea && select) {
                multiArea.classList.remove('hidden');
                if (badge) badge.textContent = `检测到多仓聚合配置（共 ${result.warehouses.length} 条线路）`;
                select.innerHTML = result.warehouses.map((w, idx) => `
                    <option value="${encodeURIComponent(w.url)}">${w.name || ('线路 ' + (idx + 1))}</option>
                `).join('');
            }
            showTvboxStatus(`解析成功！检测到多仓配置（共 ${result.warehouses.length} 条线路），请点击载入子线路`, 'success');
            return;
        }

        renderTvboxSitesPreview(result);
        if (result.compatibleSites.length > 0) {
            showTvboxStatus(`解析成功！共识别出 ${result.compatibleSites.length} 个兼容源${result.incompatibleSites.length ? `（已自动过滤 ${result.incompatibleSites.length} 个 Dex Jar 爬虫）` : ''}`, 'success');
        } else {
            showTvboxStatus(`解析完成：未发现兼容源${result.incompatibleSites.length ? `（已过滤 ${result.incompatibleSites.length} 个 Dex Jar 爬虫）` : ''}`, 'info');
        }
    } catch (e) {
        console.error('解析 TVBox 配置失败:', e);
        showTvboxStatus(`解析失败: ${e.message}`, 'error');
    }
}

function loadBuiltinTvboxSites(presetType = 'default') {
    try {
        let sites = [];
        if (presetType === 'mainstream') {
            sites = [
                { key: 'guangsu', name: '光速资源', api: 'https://api.guangsuapi.com/api.php/provide/vod/', type: 1, compatible: true, reason: '极速4K影视源' },
                { key: '360zy', name: '360资源', api: 'https://360zy.com/api.php/provide/vod', type: 1, compatible: true, reason: '稳定主流影视源' },
                { key: 'modu', name: '魔都资源', api: 'https://caiji.moduapi.cc/api.php/provide/vod/', type: 1, compatible: true, reason: '丰富主流影视源' },
                { key: 'huya', name: '虎牙采集', api: 'https://www.huyaapi.com/api.php/provide/vod/', type: 1, compatible: true, reason: '备用影视源' },
                { key: 'bfzy', name: '暴风资源', api: 'https://bfzyapi.com/api.php/provide/vod', type: 1, compatible: true, reason: '主流影视源' },
                { key: 'lzzy', name: '量子资源', api: 'http://cj.lziapi.com/api.php/provide/vod/', type: 1, compatible: true, reason: '主流影视源' },
                { key: 'ffzy', name: '非凡资源', api: 'http://cj.ffzyapi.com/api.php/provide/vod/', type: 1, compatible: true, reason: '主流影视源' },
                { key: 'hhzy', name: '豪华资源', api: 'https://hhzyapi.com/api.php/provide/vod/', type: 1, compatible: true, reason: '主流影视源' },
                { key: 'wujin', name: '无尽资源网', api: 'https://api.wujinapi.me/api.php/provide/vod/from/wjm3u8/', type: 1, compatible: true, reason: '主流影视源' },
                { key: 'jin_ying', name: '金鹰资源', api: 'https://jyzyapi.com/provide/vod', type: 1, compatible: true, reason: '主流影视源' }
            ];
        } else {
            const rawMap = window.BUILTIN_CUSTOMER_SITES || {};
            sites = Object.keys(rawMap)
                .filter(k => !rawMap[k].adult && k !== 'testSource')
                .map((k) => ({
                    key: k,
                    name: rawMap[k].name,
                    api: rawMap[k].api,
                    type: rawMap[k].type || 1,
                    compatible: true,
                    reason: rawMap[k].category === 'music' ? '精选音乐听书源' : (rawMap[k].category === 'short' ? '精选短剧源' : '精选影视源')
                }));
        }

        const result = {
            compatibleSites: sites,
            incompatibleSites: [],
            total: sites.length
        };

        renderTvboxSitesPreview(result);
        showTvboxStatus(`已载入 ${sites.length} 个兼容视频采集源，可勾选后点击下方按钮导入！`, 'success');
    } catch (e) {
        showTvboxStatus(`载入精选源失败: ${e.message}`, 'error');
    }
}

function renderTvboxSitesPreview(result) {
    currentParsedTvboxSites = result.compatibleSites || [];
    const previewArea = document.getElementById('tvboxPreviewArea');
    const countEl = document.getElementById('tvboxCompatibleCount');
    const hintEl = document.getElementById('tvboxIncompatibleHint');
    const container = document.getElementById('tvboxSitesContainer');

    if (!previewArea || !container) return;

    previewArea.classList.remove('hidden');
    if (countEl) countEl.textContent = currentParsedTvboxSites.length;
    if (hintEl) {
        if (result.incompatibleSites && result.incompatibleSites.length > 0) {
            hintEl.textContent = `(已跳过 ${result.incompatibleSites.length} 个 Dex Jar 爬虫)`;
        } else {
            hintEl.textContent = '';
        }
    }

    if (currentParsedTvboxSites.length === 0) {
        const jarCount = result.incompatibleSites ? result.incompatibleSites.length : 0;
        if (jarCount > 0) {
            container.innerHTML = `
                <div class="text-center py-6 px-4 bg-[#1a1a1a] rounded-lg border border-[#2b2b2b]">
                    <div class="text-3xl mb-2">💡</div>
                    <h4 class="text-xs font-semibold text-amber-400 mb-1.5">当前订阅中全部站点（共 ${jarCount} 个）为 Android 专属 Dex Jar 爬虫</h4>
                    <p class="text-[11px] text-gray-400 leading-relaxed max-w-md mx-auto mb-3">
                        此类源专供安卓手机/电视 TVBox APK 内的 Dalvik/ART 虚拟机动态加载，由于网页端与 Cloudflare Workers 受浏览器沙箱安全机制限制，无法执行安卓二进制代码。<br>
                        建议导入包含标准采集接口（Type 0/1/4 CMS）的 TVBox 订阅，或直接点击下方按钮使用精选源！
                    </p>
                    <div class="flex justify-center space-x-2">
                        <button onclick="loadBuiltinTvboxSites('default')" class="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors">
                            一键载入 21 个全能精选源
                        </button>
                        <button onclick="loadBuiltinTvboxSites('mainstream')" class="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-medium transition-colors">
                            一键载入主流影视仓
                        </button>
                    </div>
                </div>
            `;
        } else {
            container.innerHTML = '<div class="text-center py-6 text-gray-500 text-xs">未找到可导入的视频源</div>';
        }
        return;
    }

    container.innerHTML = currentParsedTvboxSites.map((site, index) => {
        const typeBadge = site.type === 4
            ? '<span class="text-[10px] px-1.5 py-0.5 rounded bg-purple-900/60 text-purple-300 border border-purple-700/50">T4 HTTP</span>'
            : (site.type === 0
                ? '<span class="text-[10px] px-1.5 py-0.5 rounded bg-amber-900/60 text-amber-300 border border-amber-700/50">CMS XML</span>'
                : '<span class="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/60 text-blue-300 border border-blue-700/50">CMS JSON</span>');

        return `
            <div class="flex items-center justify-between p-2 bg-[#1c1c1c] hover:bg-[#222] rounded border border-[#2a2a2a] transition-colors" id="tvbox-site-row-${index}">
                <div class="flex items-center space-x-2 flex-1 min-w-0 mr-2">
                    <input type="checkbox" id="tvbox_check_${index}" checked class="form-checkbox h-3.5 w-3.5 text-blue-600 rounded bg-[#2a2a2a] border-[#444] cursor-pointer">
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center space-x-1.5">
                            <label for="tvbox_check_${index}" class="text-xs font-medium text-white truncate cursor-pointer">${site.name}</label>
                            ${typeBadge}
                        </div>
                        <div class="text-[10px] text-gray-500 truncate" title="${site.api}">${site.api}</div>
                    </div>
                </div>
                <div class="flex items-center space-x-2 flex-shrink-0">
                    <span id="tvbox_latency_${index}" class="text-[11px] text-gray-400 font-mono">--</span>
                </div>
            </div>
        `;
    }).join('');
}

function selectAllTvboxSites(checked) {
    if (!currentParsedTvboxSites) return;
    currentParsedTvboxSites.forEach((_, idx) => {
        const cb = document.getElementById(`tvbox_check_${idx}`);
        if (cb) cb.checked = checked;
    });
}

async function testAllTvboxLatency() {
    if (!currentParsedTvboxSites || currentParsedTvboxSites.length === 0) return;
    const btn = document.getElementById('btnTvboxSpeedTest');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="inline-block animate-spin mr-1">↻</span> 测速中...';
    }

    const promises = currentParsedTvboxSites.map(async (site, idx) => {
        const latencyEl = document.getElementById(`tvbox_latency_${idx}`);
        if (latencyEl) latencyEl.innerHTML = '<span class="text-gray-500">检测中...</span>';
        const res = await window.TVBox.testSiteLatency(site.api);
        if (latencyEl) {
            if (res.success) {
                const color = res.latency < 800 ? 'text-emerald-400' : (res.latency < 2000 ? 'text-yellow-400' : 'text-orange-400');
                latencyEl.innerHTML = `<span class="${color}">${res.latency}ms</span>`;
            } else {
                latencyEl.innerHTML = `<span class="text-red-400" title="${res.error || '失败'}">不可用</span>`;
            }
        }
    });

    await Promise.allSettled(promises);
    if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<span>⚡ 一键测速</span>';
    }
}

function applyTvboxImport(overwrite = false) {
    if (!currentParsedTvboxSites || currentParsedTvboxSites.length === 0) {
        showToast('暂无解析出的站点可供导入', 'warning');
        return;
    }

    const selectedSites = [];
    currentParsedTvboxSites.forEach((site, idx) => {
        const cb = document.getElementById(`tvbox_check_${idx}`);
        if (cb && cb.checked) {
            selectedSites.push(site);
        }
    });

    if (selectedSites.length === 0) {
        showToast('请至少勾选一个要导入的站点', 'warning');
        return;
    }

    if (overwrite && !confirm('确认覆盖导入？这将清空您之前保存的自定义接口！')) {
        return;
    }

    const res = window.TVBox.importSitesToCustom(selectedSites, overwrite);
    if (res.success) {
        // 重新从 localStorage 加载并渲染自定义源列表
        customAPIs = JSON.parse(localStorage.getItem('customAPIs') || '[]');
        selectedAPIs = JSON.parse(localStorage.getItem('selectedAPIs') || '[]');
        renderCustomAPIsList();
        updateSelectedApiCount();
        initAPICheckboxes();
        showToast(res.message, 'success');
        closeTvboxModal();
    } else {
        showToast(res.message || '导入失败', 'error');
    }
}

function exportTvboxConfig() {
    try {
        const jsonStr = window.TVBox.exportToTvboxJson();
        saveStringAsFile(jsonStr, 'LibreTV_TVBox_Config_' + Date.now() + '.json');
        showToast('已导出 TVBox 标准配置文件', 'success');
    } catch (e) {
        console.error('导出失败:', e);
        showToast('导出失败: ' + e.message, 'error');
    }
}
