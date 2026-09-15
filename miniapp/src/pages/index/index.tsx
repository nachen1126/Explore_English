import Taro from '@tarojs/taro';
import { Button, Text, View } from '@tarojs/components';
import { useLearning } from '../../state/learning';
import './index.scss';

export default function HomePage() {
  const { user, guest, ready, syncState, message, continueAsGuest, login } = useLearning();
  if (!ready) return <View className='page'><Text>Loading…</Text></View>;
  const entered = !!user || guest;
  return <View className='page home-page'>
    <Text className='eyebrow'>Learn through places</Text>
    <Text className='title'>Explore English</Text>
    <Text className='muted'>在真实场景中发现单词、完成挑战。</Text>
    {!entered ? <View className='card login-choice'>
      <Text className='choice-title'>选择开始方式</Text>
      <Button className='button primary' onClick={() => void login().catch(() => undefined)}>微信登录</Button>
      <Button className='button' onClick={continueAsGuest}>游客试用</Button>
      <Text className='muted privacy-note'>微信登录仅用于跨设备同步学习进度。</Text>
    </View> : <>
      <View className='identity-strip'>
        <Text>{user ? `${user.nickname || '微信学习者'} · ${syncState === 'synced' ? '已同步' : syncState === 'error' ? '待同步' : '本机已保存'}` : '游客模式 · 本机保存'}</Text>
        <Text className='profile-link' onClick={() => Taro.navigateTo({ url: '/pages/profile/index' })}>我的 →</Text>
      </View>
      <View className='card category-card' onClick={() => Taro.navigateTo({ url: '/pages/category/index' })}>
        <Text className='category-kicker'>Food & Dining · 饮食篇</Text>
        <Text className='category-title'>Kitchen · Cooking</Text>
        <Text className='muted'>10 words · 一个完整 MVP 场景</Text>
        <Button className='button primary'>进入分类</Button>
      </View>
    </>}
    {message ? <View className='status error'><Text>{message}</Text></View> : null}
  </View>;
}
