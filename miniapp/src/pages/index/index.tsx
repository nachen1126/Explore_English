import Taro from '@tarojs/taro';
import { Button, Text, View } from '@tarojs/components';
import { miniappCategories, miniappSceneById, miniappScenes, scenesForCategory } from '../../data/catalog';
import { useLearning } from '../../state/learning';
import { syncStateLabel, uiCopy } from '../../ui/copy';
import './index.scss';

export default function HomePage() {
  const { user, guest, ready, syncState, message, snapshot, continueAsGuest, login } = useLearning();
  if (!ready) return <View className='page'><Text>{uiCopy.loading}</Text></View>;
  const entered = !!user || guest;
  const unfinished = Object.values(snapshot.attempts).filter(attempt => !attempt.completedAt).sort((a, b) => b.startedAt - a.startedAt)[0];
  const latestProgress = Object.values(snapshot.progress).filter(progress => miniappSceneById[progress.sceneId])
    .sort((a, b) => b.updatedAt - a.updatedAt)[0];
  const continueScene = unfinished ? miniappSceneById[unfinished.sceneId]
    : latestProgress ? miniappSceneById[latestProgress.sceneId] : undefined;
  const totalDiscovered = Object.values(snapshot.progress).reduce((sum, progress) => sum + progress.discoveredVocabularyIds.length, 0);
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
      {continueScene ? <View className='card continue-card'>
        <Text className='category-kicker'>继续学习</Text>
        <Text className='continue-title'>{unfinished ? `继续${continueScene.chineseTitle}挑战` : continueScene.chineseTitle}</Text>
        <Text className='muted'>{unfinished ? '未完成的挑战已安全保存。'
          : `已发现 ${latestProgress?.discoveredVocabularyIds.length ?? 0}/${continueScene.vocabularyIds.length} 个单词`}</Text>
        <Button className='button primary' onClick={() => Taro.navigateTo({ url: unfinished
          ? `/pages/challenge/index?attemptId=${unfinished.attemptId}` : `/pages/scene/index?sceneId=${continueScene.id}` })}>继续</Button>
      </View> : null}
      <Text className='home-section-title'>选择分类</Text>
      <View className='category-list'>{miniappCategories.map(category => {
        const categoryScenes = scenesForCategory(category.id);
        const discovered = categoryScenes.reduce((sum, scene) => sum
          + (snapshot.progress[scene.id]?.discoveredVocabularyIds.length ?? 0), 0);
        return <View key={category.id} className='card category-card'
          onClick={() => Taro.navigateTo({ url: `/pages/category/index?categoryId=${category.id}` })}>
          <Text className='category-kicker'>{category.chineseTitle}</Text>
          <Text className='category-title'>{category.title}</Text>
          <Text className='muted'>{categoryScenes.length} 个已开放场景 · 已发现 {discovered}/{categoryScenes.length * 10} 个单词</Text>
          <Button className='button primary'>进入分类</Button>
        </View>;
      })}</View>
      <Text className='home-summary'>共 {miniappScenes.length} 个场景 · 已发现 {totalDiscovered}/{miniappScenes.length * 10} 个单词</Text>
    </>}
    {message ? <View className='status error'><Text>{message}</Text></View> : null}
  </View>;
}
