const CUSTOMER_SITES = {
    // 默认内置源
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
    },
    // 精选 TVBox / CMS 采集源 (来自 _cms_endpoints.json)
    hema: {
        api: 'http://nm.4688888.xyz/vod/hema/hm.php/provide/vod/',
        name: '河马｜短剧(JX)',
        type: 1
    },
    yd: {
        api: 'https://nm.4688888.xyz/vod/138.php/provide/vod/',
        name: '移动｜4K(JX)',
        type: 1
    },
    acfun: {
        api: 'https://nm.4688888.xyz/vod/acfun.php/provide/vod/',
        name: 'A站｜4K(JX)',
        type: 1
    },
    yd1: {
        api: 'https://nm.4688888.xyz/vod/bix.php/provide/vod/',
        name: '移动①｜4K(JX)',
        type: 1
    },
    gz: {
        api: 'https://nm.4688888.xyz/vod/gzys.php/provide/vod',
        name: '洽洽｜替换(JX)',
        type: 1
    },
    jingcheng: {
        api: 'https://nm.4688888.xyz/vod/jc.php/provide/vod/',
        name: '京城｜1K',
        type: 1
    },
    shupian: {
        api: 'https://nm.4688888.xyz/vod/ls.php/provide/vod/',
        name: '乐视｜1K(JX)',
        type: 1
    },
    rr: {
        api: 'https://nm.4688888.xyz/vod/rr.php/provide/vod/',
        name: '人人｜4K(JX)',
        type: 1
    },
    kuwo: {
        api: 'http://nm.4688888.xyz/vod/kuwo/kuwo.php/provide/vod/',
        name: '酷我｜音乐(JX)',
        type: 1
    },
    kuwot: {
        api: 'http://nm.4688888.xyz/vod/kuwo/kuwot.php/provide/vod/',
        name: '酷我｜听书(JX)',
        type: 1
    },
    kuwot_dm: {
        api: 'http://nm.4688888.xyz/vod/kuwo/kuwotdm.php/provide/vod/',
        name: '酷我｜听书-DM(JX)',
        type: 4
    },
    kuwo_dm: {
        api: 'http://nm.4688888.xyz/vod/kuwo/kwdm.php/provide/vod/',
        name: '酷我｜音乐-DM(JX)',
        type: 4
    },
    qqmusic: {
        api: 'http://nm.4688888.xyz/vod/qqmusic.php/provide/vod/',
        name: '秋秋｜音乐(JX)',
        type: 4
    },
    qqmusic_dm: {
        api: 'http://nm.4688888.xyz/vod/qqmusicdm.php/provide/vod/',
        name: '秋秋｜音乐-DM(JX)',
        type: 4
    },
    xmly: {
        api: 'http://nm.4688888.xyz/vod/xmly_a.php/provide/vod/',
        name: '喜马拉雅｜听书(JX)',
        type: 1
    },
    migu: {
        api: 'https://nm.4688888.xyz/vod/migu.php/provide/vod',
        name: '咪咕｜音乐(JX)',
        type: 1
    },
    wyy: {
        api: 'https://nm.4688888.xyz/vod/wyy.php/provide/vod',
        name: '网易云｜音乐(JX)',
        type: 1
    }
};

// 暴露内置源供 TVBox 管理面板快速恢复与参考
window.BUILTIN_CUSTOMER_SITES = CUSTOMER_SITES;

// 调用全局方法合并
if (window.extendAPISites) {
    window.extendAPISites(CUSTOMER_SITES);
} else {
    console.error("错误：请先加载 config.js！");
}
