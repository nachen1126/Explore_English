import Taro from '@tarojs/taro';
import { Button, Input, Text, View } from '@tarojs/components';
import { useState } from 'react';
import { useLearning } from '../../state/learning';
import { uploadProfileAvatar } from '../../services/cloud';
import './index.scss';

export default function ProfilePage() {
  const { user, guest, syncState, message, login, logout, retrySync, updateProfile } = useLearning();
  const [nickname, setNickname] = useState(user?.nickname ?? '');
  async function chooseAvatar() {
    if (!user) return;
    try {
      const result = await Taro.chooseMedia({ count: 1, mediaType: ['image'], sourceType: ['album', 'camera'] });
      const filePath = result.tempFiles[0]?.tempFilePath;
      if (!filePath) return;
      const cloudFileId = await uploadProfileAvatar(filePath, user.id);
      await updateProfile(nickname.trim() || null, cloudFileId);
    } catch { /* User cancellation changes nothing. */ }
  }
  return <View className='page profile-page'>
    <Text className='eyebrow'>Account & Sync</Text><Text className='title'>{user ? '微信账户' : '游客试用'}</Text>
    {user ? <View className='card'>
      <Text className='label'>User ID</Text><Text className='user-id'>{user.id}</Text>
      <Text className='label'>昵称（可选）</Text><Input className='input' value={nickname} maxlength={40} onInput={event => setNickname(event.detail.value)} />
      <Button className='button primary' onClick={() => void updateProfile(nickname.trim() || null, user.avatar)}>保存昵称</Button>
      <Button className='button' onClick={() => void chooseAvatar()}>主动选择头像</Button>
      <Text className='muted'>Sync: {syncState}</Text>
      {syncState === 'error' ? <Button className='button' onClick={() => void retrySync()}>重试同步</Button> : null}
      <Button className='button warn' onClick={() => { logout(); void Taro.reLaunch({ url: '/pages/index/index' }); }}>退出登录</Button>
    </View> : <View className='card'><Text>{guest ? '学习进度仅保存在本机。' : '请选择登录或游客试用。'}</Text>
      <Button className='button primary' onClick={() => void login().catch(() => undefined)}>微信登录并同步</Button></View>}
    {message ? <View className='status error'><Text>{message}</Text></View> : null}
  </View>;
}
