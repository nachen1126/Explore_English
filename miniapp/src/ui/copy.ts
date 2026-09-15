export const uiCopy = {
  appName: '探索英语',
  kitchenTitle: '厨房 · 烹饪',
  home: '首页',
  loading: '正在加载…',
  playPronunciation: '播放发音',
  playAgain: '再次播放',
  loadingPronunciation: '正在加载…',
  voiceAnswer: '语音回答',
  listening: '正在聆听…',
  recognizing: '正在识别…',
  tryAgain: '再试一次',
  nextQuestion: '下一题',
  viewResults: '查看成绩',
} as const;

export const challengeModeLabel = (mode: 'find' | 'produce') => mode === 'find' ? '听音找物' : '看图说词';

export const syncStateLabel = (state: 'local' | 'syncing' | 'synced' | 'error') => ({
  local: '已保存在本机',
  syncing: '正在同步…',
  synced: '已同步',
  error: '等待同步',
}[state]);
