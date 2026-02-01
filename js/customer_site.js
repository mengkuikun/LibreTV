const CUSTOMER_SITES = {
    qiqi: {
        api: 'https://www.qiqidys.com/api.php/provide/vod',
        name: '七七资源',
    },
    nm_hema: {
        api: 'http://nm.4688888.xyz/vod/hema/hm.php/provide/vod/',
        name: '河马丨短剧(JX)',
    },
    nm_kuwo_music: {
        api: 'http://nm.4688888.xyz/vod/kuwo/kuwo.php/provide/vod/',
        name: '酷我丨音乐(JX)',
    },
    nm_kuwo_audio: {
        api: 'http://nm.4688888.xyz/vod/kuwo/kuwot.php/provide/vod/',
        name: '酷我丨听书(JX)',
    },
    nm_kuwo_audio_dm: {
        api: 'http://nm.4688888.xyz/vod/kuwo/kuwotdm.php/provide/vod/',
        name: '酷我丨听书(JX) DM',
    },
    nm_kuwo_music_dm: {
        api: 'http://nm.4688888.xyz/vod/kuwo/kwdm.php/provide/vod/',
        name: '酷我丨音乐(JX) DM',
    },
    nm_qqmusic: {
        api: 'http://nm.4688888.xyz/vod/qqmusic.php/provide/vod/',
        name: '秋秋丨音乐(JX)',
    },
    nm_qqmusic_dm: {
        api: 'http://nm.4688888.xyz/vod/qqmusicdm.php/provide/vod/',
        name: '秋秋丨音乐(JX) DM',
    },
    nm_xmly: {
        api: 'http://nm.4688888.xyz/vod/xmly_a.php/provide/vod/',
        name: '喜马拉雅丨听书(JX)',
    },
    nm_mobile_4k: {
        api: 'https://nm.4688888.xyz/vod/138.php/provide/vod/',
        name: '移动丨4K(JX)',
    },
    nm_acfun_4k: {
        api: 'https://nm.4688888.xyz/vod/acfun.php/provide/vod/',
        name: 'A站丨4K(JX)',
    },
    nm_mobile_4k_alt: {
        api: 'https://nm.4688888.xyz/vod/bix.php/provide/vod/',
        name: '移动②丨4K(JX)',
    },
    nm_gz_replace: {
        api: 'https://nm.4688888.xyz/vod/gzys.php/provide/vod',
        name: '泸泸丨替换(JX)',
    },
    nm_jc_1k: {
        api: 'https://nm.4688888.xyz/vod/jc.php/provide/vod/',
        name: '京城丨1K',
    },
    nm_leshi_1k: {
        api: 'https://nm.4688888.xyz/vod/ls.php/provide/vod/',
        name: '乐视丨1K(JX)',
    },
    nm_migu_music: {
        api: 'https://nm.4688888.xyz/vod/migu.php/provide/vod',
        name: '咪咕丨音乐(JX)',
    },
    nm_rr_4k: {
        api: 'https://nm.4688888.xyz/vod/rr.php/provide/vod/',
        name: '人人丨4K(JX)',
    },
    nm_wyy_music: {
        api: 'https://nm.4688888.xyz/vod/wyy.php/provide/vod',
        name: '网易云丨音乐(JX)',
    }
};

// 调用全局方法合并
if (window.extendAPISites) {
    window.extendAPISites(CUSTOMER_SITES);
} else {
    console.error("错误：请先加载 config.js！");
}
