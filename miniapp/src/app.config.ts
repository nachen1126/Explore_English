export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/category/index',
    'pages/scene/index',
    'pages/challenge/index',
    'pages/result/index',
    'pages/profile/index',
  ],
  window: {
    navigationBarBackgroundColor: '#f7f3e9',
    navigationBarTextStyle: 'black',
    navigationBarTitleText: 'Explore English',
    backgroundColor: '#f7f3e9',
  },
  style: 'v2',
  sitemapLocation: 'sitemap.json',
  permission: {
    'scope.record': { desc: '用于识别你练习的英语单词' },
  },
});
