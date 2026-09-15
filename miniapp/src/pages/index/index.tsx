import Taro from '@tarojs/taro';
import { Button, Text, View } from '@tarojs/components';
import { kitchenScene } from '@shared';
import { useLearning } from '../../state/learning';
import './index.scss';

export default function HomePage() {
  const { user, guest, ready, syncState, message, snapshot, continueAsGuest, login } = useLearning();
  if (!ready) return <View className='page'><Text>Loading…</Text></View>;
  const entered = !!user || guest;
  const count = snapshot.progress[kitchenScene.id]?.discoveredVocabularyIds.length ?? 0;
  const unfinished = Object.values(snapshot.attempts).filter(attempt => !attempt.completedAt).sort((a, b) => b.startedAt - a.startedAt)[0];
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
      {count > 0 || unfinished ? <View className='card continue-card'>
        <Text className='category-kicker'>Continue learning · 继续学习</Text>
        <Text className='continue-title'>{unfinished ? 'Resume Kitchen Challenge' : kitchenScene.title}</Text>
        <Text className='muted'>{unfinished ? '未完成的挑战已安全保存。' : `${count}/10 words discovered`}</Text>
        <Button className='button primary' onClick={() => Taro.navigateTo({ url: unfinished
          ? `/pages/challenge/index?attemptId=${unfinished.attemptId}` : '/pages/scene/index' })}>Continue</Button>
      </View> : null}
      <View className='card category-card' onClick={() => Taro.navigateTo({ url: '/pages/category/index' })}>
        <Text className='category-kicker'>Food & Dining · 饮食篇</Text>
        <Text className='category-title'>Choose a scene</Text>
        <Text className='muted'>1 published scene · {count}/10 words discovered</Text>
        <Button className='button primary'>进入分类</Button>
      </View>
    </>}
    {message ? <View className='status error'><Text>{message}</Text></View> : null}
  </View>;
}
