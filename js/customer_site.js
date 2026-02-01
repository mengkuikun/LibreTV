const CUSTOMER_SITES = {
    qiqi: {
        api: 'https://www.qiqidys.com/api.php/provide/vod',
        name: '七七资源',
    },
    wujin: {
        api: 'https://api.wujinapi.me/api.php/provide/vod/from/wjm3u8/',
        name: '无尽资源网',
    },
    jin_ying: {
        api: 'https://jyzyapi.com/provide/vod',
        name: '金鹰资源',
    },
    hong_niu: {
        api: 'https://www.hongniuzy2.com/api.php/provide/vod/',
        name: '红牛资源',
    },
    jin_chan: {
        api: 'https://zy.jinchancaiji.com/api.php/provide/vod/',
        name: '金蝉资源',
    }
};

// 调用全局方法合并
if (window.extendAPISites) {
    window.extendAPISites(CUSTOMER_SITES);
} else {
    console.error("错误：请先加载 config.js！");
}
