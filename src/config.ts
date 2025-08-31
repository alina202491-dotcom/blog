// config.ts (最终修正版)

export default {
  // 网站标题
  Title: '𝐼𝐾𝑈𝑁的博客',
  // 网站地址
  Site: 'https://blog.204090.xyz',
  // 网站副标题
  Subtitle: '唱跳𝓇𝒶𝓅打篮球，我是𝒾𝓀𝓊𝓃我最牛',
  // 网站描述
  Description: '𝐼𝐾𝑈𝑁博客 专注于前开发与相关技术的实战分享，涵盖𝑉𝑢𝑒框架、𝑁𝑜𝑑𝑒.𝑗𝑠、𝑆𝑒𝑟𝑣𝑒𝑟𝑙𝑒𝑠𝑠等，并涉及𝑁𝑜𝑑𝑒、𝑃𝑦𝑡ℎ𝑜𝑛、𝐿𝑖𝑛𝑢𝑥、𝐷𝑜𝑐𝑘𝑒𝑟等领域。同时，博客也分享作者的生活、音乐和旅行的热爱。',
  // 网站作者
  Author: '𝑰𝑲𝑼𝑵',
  // 作者头像
  Avatar: 'https://img.8888.vvvv.ee/file/图片/1751855752412.jpg',
  // 网站座右铭
  Motto: '莫愁天下无知己，天下谁人不识坤',
  // Cover 网站缩略图
  Cover: '/assets/images/banner/xhj29.gif',
  
  /**
   * ✅ 关键修改：全局 Head 配置
   * 在这里添加的脚本和样式会应用到全站，并且只加载一次。
   * 这能完美解决您遇到的页面切换时特效重叠的问题。
   */
  head: [
    ['script', { src: 'https://api.vvhan.com/api/script/yinghua' }]
  ],
  
  // 网站侧边栏公告 (不填写即不开启)
  Tips: '<p>欢迎各位𝐼𝐾𝑈𝑁𝑆光临我的博客 🎉</p><p>这里会分享我的日常和学习中的收集、整理及总结，希望能对你有所帮助:) 💖</p><img src="https://img.8888.vvvv.ee/file/图片/1752036848067.webp" alt="ikun-tips" width=100% />',
  
  // 首页打字机文案列表
  TypeWriteList: [
    '不曾与你分享的时间,我在进步.',
    "𝙄 𝙖𝙢 𝙢𝙖𝙠𝙞𝙣𝙜 𝙥𝙧𝙤𝙜𝙧𝙚𝙨𝙨 𝙞𝙣 𝙩𝙝𝙚 𝙩𝙞𝙢𝙚 𝙄 𝙝𝙖𝙫𝙚𝙣'𝙩 𝙨𝙝𝙖𝙧𝙚𝙙 𝙬𝙞𝙩𝙝 𝙮𝙤𝙪.",
  ],
  // 网站创建时间
  CreateTime: '2025-07-01',
  // 顶部 Banner 配置
  HomeBanner: {
    enable: true,
    HomeHeight: '54rem',
    PageHeight: '54rem',
    background: "url('/assets/images/www.alltoall.net_7月9日_4Z1MKq6eXI.gif') no-repeat center 60%/cover",
  },
  // 博客主题配置
  Theme: {
    "--vh-main-color": "rgba(232,159,28,0.78)",
    "--vh-font-color": "#000000",
    "--vh-aside-width": "318px",
    "--vh-main-radius": "0.88rem",
    "--vh-main-max-width": "1458px",
  },
  // 导航栏
  Navs: [
    { text: '圈子', link: '/friends', icon: 'Nav_friends' },
    { text: '友链', link: '/links', icon: 'Nav_link' },
    { text: '动态', link: '/talking', icon: 'Nav_talking' },
    { text: '昔日', link: '/archives', icon: 'Nav_archives' },
    { text: '留言', link: '/message', icon: 'Nav_message' },
    { text: '关于', link: '/about', icon: 'Nav_about' },
  ],
  // 侧边栏个人网站
  WebSites: [
    { text: 'Github', link: 'https://github.com/gdydg', icon: 'WebSite_github' },
    { text: '韩小韩API', link: 'https://api.vvhan.com', icon: 'WebSite_api' },
    { text: '每日热榜', link: 'https://news.ssss.bio/', icon: 'WebSite_hot' },
    { text: 'IKUN导航', link: 'https://nas.marvellab.tech/', icon: 'ballpen' },
    { text: 'ikun图床', link: 'https://img.8888.vvvv.ee/', icon: 'WebSite_img' },
    { text: 'HanAnalytics', link: 'https://analytic.idrive.qzz.io', icon: 'WebSite_analytics' },
  ],
  // 侧边栏展示
  AsideShow: {
    WebSitesShow: true,
    CategoriesShow: true,
    TagsShow: true,
    recommendArticleShow: true
  },
  // DNS预解析地址
  DNSOptimization: [
    'https://i0.wp.com',
    'https://cn.cravatar.com',
    'https://analytics.vvhan.com',
    'https://vh-api.4ce.cn',
    'https://registry.npmmirror.com',
    'https://pagead2.googlesyndication.com'
  ],
  // 博客音乐组件解析接口
  vhMusicApi: 'https://vh-api.4ce.cn/blog/meting',
  // 评论组件
  // 评论组件（只允许同时开启一个）
  Comment: {
    // Twikoo 评论
    Twikoo: {
      enable: false,
      envId: ''
    },
    // Waline 评论
    Waline: {
      enable: true,
      serverURL: "https://comment.yao.bio"
    }
  },
  // Han Analytics 统计
  HanAnalytics: { enable: true, server: 'https://analytic.idrive.qzz.io', siteId: 'Hello-HanHexoBlog' },
  // Google 广告
  GoogleAds: {
    ad_Client: '', //ca-pub-xxxxxx
    asideAD_Slot: `<ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-xxxxxx" data-ad-slot="xxxxxx" data-ad-format="auto" data-full-width-responsive="true"></ins>`,
    articleAD_Slot: `<ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-xxxxxx" data-ad-slot="xxxxxx" data-ad-format="auto" data-full-width-responsive="true"></ins>`
  },
  // 访问网页 自动推送到搜索引擎
  SeoPush: {
    enable: false,
    serverApi: '',
    paramsName: 'url'
  },
  // 页面阻尼滚动速度
  ScrollSpeed: 666
}
