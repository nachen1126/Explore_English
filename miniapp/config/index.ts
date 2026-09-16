import path from 'node:path';
import { defineConfig } from '@tarojs/cli';

export default defineConfig({
  projectName: 'explore-english-miniapp',
  date: '2026-09-15',
  designWidth: 750,
  deviceRatio: { 750: 1 },
  sourceRoot: 'src',
  outputRoot: 'dist',
  framework: 'react',
  compiler: 'webpack5',
  cache: { enable: false },
  alias: { '@shared': path.resolve(__dirname, '../../packages/shared/dist') },
  defineConstants: {
    'process.env.TARO_APP_CLOUDBASE_ENV': JSON.stringify(process.env.TARO_APP_CLOUDBASE_ENV ?? ''),
  },
  copy: {
    patterns: [{
      from: path.resolve(__dirname, '../assets/scenes'),
      to: path.resolve(__dirname, '../dist/assets/scenes'),
    }],
    options: {},
  },
  mini: {
    postcss: {
      pxtransform: { enable: true, config: {} },
      cssModules: { enable: false, config: { namingPattern: 'module', generateScopedName: '[name]__[local]___[hash:base64:5]' } },
    },
  },
});
