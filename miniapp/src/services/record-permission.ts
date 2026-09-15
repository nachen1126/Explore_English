import Taro from '@tarojs/taro';

interface RecordPermissionApi {
  getSetting(): Promise<{ authSetting: object }>;
  authorize(options: { scope: 'scope.record' }): Promise<unknown>;
}

export async function requestRecordPermission(api: RecordPermissionApi = Taro): Promise<boolean> {
  try {
    const setting = await api.getSetting();
    const authSetting = setting.authSetting as Record<string, boolean | undefined>;
    if (authSetting['scope.record'] === true) return true;
    await api.authorize({ scope: 'scope.record' });
    return true;
  } catch (error) {
    console.error('[Explore English][Recorder] microphone authorization failed.', error);
    return false;
  }
}
