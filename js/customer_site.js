const CUSTOMER_SITES = {
    // 优质高效影视大源 (实测极速响应，推荐核心)
    guangsu: {
        api: 'https://api.guangsuapi.com/api.php/provide/vod/',
        name: '光速资源',
        type: 1,
        category: 'video',
        tag: '极速'
    },
    '360zy': {
        api: 'https://360zy.com/api.php/provide/vod',
        name: '360资源',
        type: 1,
        category: 'video',
        tag: '稳定'
    },
    modu: {
        api: 'https://caiji.moduapi.cc/api.php/provide/vod/',
        name: '魔都资源',
        type: 1,
        category: 'video',
        tag: '丰富'
    },
    huya: {
        api: 'https://www.huyaapi.com/api.php/provide/vod/',
        name: '虎牙采集',
        type: 1,
        category: 'video',
        tag: '备用'
    },
    // 主流稳定综合影视源 (官方标准接口)
    bfzy: {
        api: 'https://bfzyapi.com/api.php/provide/vod',
        name: '暴风资源',
        type: 1,
        category: 'video',
        tag: '影视'
    },
    lzzy: {
        api: 'http://cj.lziapi.com/api.php/provide/vod/',
        name: '量子资源',
        type: 1,
        category: 'video',
        tag: '影视'
    },
    ffzy: {
        api: 'http://cj.ffzyapi.com/api.php/provide/vod/',
        name: '非凡资源',
        type: 1,
        category: 'video',
        tag: '影视'
    },
    hhzy: {
        api: 'https://hhzyapi.com/api.php/provide/vod/',
        name: '豪华资源',
        type: 1,
        category: 'video',
        tag: '影视'
    },
    wujin: {
        api: 'https://api.wujinapi.me/api.php/provide/vod/from/wjm3u8/',
        name: '无尽资源网',
        type: 1,
        category: 'video',
        tag: '影视'
    },
    jin_ying: {
        api: 'https://jyzyapi.com/provide/vod',
        name: '金鹰资源',
        type: 1,
        category: 'video',
        tag: '影视'
    },
    // 4K超清与精选影视
    acfun: {
        api: 'https://nm.4688888.xyz/vod/acfun.php/provide/vod/',
        name: 'A站｜4K(JX)',
        type: 1,
        category: 'video',
        tag: '4K'
    },
    shupian: {
        api: 'https://nm.4688888.xyz/vod/ls.php/provide/vod/',
        name: '乐视｜1K(JX)',
        type: 1,
        category: 'video',
        tag: '1080P'
    },
    rr: {
        api: 'https://nm.4688888.xyz/vod/rr.php/provide/vod/',
        name: '人人｜4K(JX)',
        type: 1,
        category: 'video',
        tag: '4K'
    },
    // 短剧专区 (独立分类)
    hema: {
        api: 'http://nm.4688888.xyz/vod/hema/hm.php/provide/vod/',
        name: '河马｜短剧(JX)',
        type: 1,
        category: 'short',
        tag: '短剧'
    },
    // 音乐与音频听书 (独立分类，默认不与影视混选)
    kuwo: {
        api: 'http://nm.4688888.xyz/vod/kuwo/kuwo.php/provide/vod/',
        name: '酷我｜音乐(JX)',
        type: 1,
        category: 'music',
        tag: '音乐'
    },
    kuwot: {
        api: 'http://nm.4688888.xyz/vod/kuwo/kuwot.php/provide/vod/',
        name: '酷我｜听书(JX)',
        type: 1,
        category: 'music',
        tag: '听书'
    },
    kuwot_dm: {
        api: 'http://nm.4688888.xyz/vod/kuwo/kuwotdm.php/provide/vod/',
        name: '酷我｜听书-DM(JX)',
        type: 4,
        category: 'music',
        tag: '听书'
    },
    kuwo_dm: {
        api: 'http://nm.4688888.xyz/vod/kuwo/kwdm.php/provide/vod/',
        name: '酷我｜音乐-DM(JX)',
        type: 4,
        category: 'music',
        tag: '音乐'
    },
    qqmusic: {
        api: 'http://nm.4688888.xyz/vod/qqmusic.php/provide/vod/',
        name: '秋秋｜音乐(JX)',
        type: 4,
        category: 'music',
        tag: '音乐'
    },
    qqmusic_dm: {
        api: 'http://nm.4688888.xyz/vod/qqmusicdm.php/provide/vod/',
        name: '秋秋｜音乐-DM(JX)',
        type: 4,
        category: 'music',
        tag: '音乐'
    },
    wyy: {
        api: 'https://nm.4688888.xyz/vod/wyy.php/provide/vod',
        name: '网易云｜音乐(JX)',
        type: 1,
        category: 'music',
        tag: '音乐'
    },
    // 成人测试源 (原站预设，关掉黄色内容过滤后展示)
    testSource: {
        api: 'https://www.example.com/api.php/provide/vod',
        name: '空内容测试源',
        type: 1,
        category: 'adult',
        adult: true,
        tag: '测试'
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
