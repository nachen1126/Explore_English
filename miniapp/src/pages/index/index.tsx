import Taro from '@tarojs/taro';
import { Button, Text, View } from '@tarojs/components';
import { kitchenScene } from '@shared';
import { useLearning } from '../../state/learning';
import { syncStateLabel, uiCopy } from '../../ui/copy';
import './index.scss';

export default function HomePage() {
  const { user, guest, ready, syncState, message, snapshot, continueAsGuest, login } = useLearning();
  if (!ready) return <View className='page'><Text>{uiCopy.loading}</Text></View>;
  const entered = !!user || guest;
  const count = snapshot.progress[kitchenScene.id]?.discoveredVocabularyIds.length ?? 0;
  const unfinished = Object.values(snapshot.attempts).filter(attempt => !attempt.completedAt).sort((a, b) => b.startedAt - a.startedAt)[0];
  return <View className='page home-page'>
    <Text className='eyebrow'>在场景中学习</Text>
    <Text className='title'>{uiCopy.appName}</Text>
    <Text className='muted'>在真实场景中发现单词、完成挑战。</Text>
    {!entered ? <View className='card login-choice'>
      <Text className='choice-title'>选择开始方式</Text>
      <Button className='button primary' onClick={() => void login().catch(() => undefined)}>微信登录</Button>
      <Button className='button' onClick={continueAsGuest}>游客试用</Button>
      <Text className='muted privacy-note'>微信登录仅用于跨设备同步学习进度。</Text>
    </View> : <>
      <View className='identity-strip'>
        <Text>{user ? `${user.nickname || '微信学习者'} · ${syncStateLabel(syncState)}` : '游客模式 · 已保存在本机'}</Text>
        <Text className='profile-link' onClick={() => Taro.navigateTo({ url: '/pages/profile/index' })}>我的 →</Text>
      </View>
      {count > 0 || unfinished ? <View className='card continue-card'>
        <Text className='category-kicker'>继续学习</Text>
        <Text className='continue-title'>{unfinished ? '继续厨房挑战' : uiCopy.kitchenTitle}</Text>
        <Text className='muted'>{unfinished ? '未完成的挑战已安全保存。' : `已发现 ${count}/10 个单词`}</Text>
        <Button className='button primary' onClick={() => Taro.navigateTo({ url: unfinished
          ? `/pages/challenge/index?attemptId=${unfinished.attemptId}` : '/pages/scene/index' })}>继续</Button>
      </View> : null}
      <View className='card category-card' onClick={() => Taro.navigateTo({ url: '/pages/category/index' })}>
        <Text className='category-kicker'>饮食篇</Text>
        <Text className='category-title'>选择场景</Text>
        <Text className='muted'>1 个已开放场景 · 已发现 {count}/10 个单词</Text>
        <Button className='button primary'>进入分类</Button>
      </View>
    </>}
    {message ? <View className='status error'><Text>{message}</Text></View> : null}
  </View>;
}
