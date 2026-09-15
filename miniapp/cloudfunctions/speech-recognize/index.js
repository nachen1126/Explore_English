'use strict';
const cloud = require('wx-server-sdk');
const tencentcloud = require('tencentcloud-sdk-nodejs-asr');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const ok = data => ({ ok: true, data });
const fail = (error, message) => ({ ok: false, error, message });

exports.main = async event => {
  const { OPENID } = cloud.getWXContext();
  if (!OPENID) return fail('UNAUTHENTICATED', '无法确认微信用户身份。');
  if (typeof event.fileID !== 'string' || !event.fileID || typeof event.recognitionId !== 'string' || !event.recognitionId) {
    return fail('INVALID_REQUEST', '录音数据不完整。');
  }
  const {
    TENCENT_SECRET_ID,
    TENCENT_SECRET_KEY,
    TENCENT_ASR_PROJECT_ID = '0',
    TENCENT_ASR_REGION = 'ap-shanghai',
  } = process.env;
  if (!TENCENT_SECRET_ID || !TENCENT_SECRET_KEY) {
    console.error('speech recognition is missing server credentials', { recognitionId: event.recognitionId });
    return fail('ASR_NOT_CONFIGURED', '语音识别服务尚未配置，请联系管理员。');
  }
  try {
    const downloaded = await cloud.downloadFile({ fileID: event.fileID });
    const buffer = downloaded.fileContent;
    if (!buffer || buffer.length < 800) return ok({ text: '', recognitionId: event.recognitionId, noSpeech: true });
    const Client = tencentcloud.asr.v20190614.Client;
    const client = new Client({
      credential: { secretId: TENCENT_SECRET_ID, secretKey: TENCENT_SECRET_KEY },
      region: TENCENT_ASR_REGION,
      profile: { httpProfile: { endpoint: 'asr.tencentcloudapi.com' } },
    });
    const response = await client.SentenceRecognition({
      ProjectId: Number.isFinite(Number(TENCENT_ASR_PROJECT_ID)) ? Number(TENCENT_ASR_PROJECT_ID) : 0,
      SubServiceType: 2, EngSerViceType: '16k_en',
      SourceType: 1, VoiceFormat: event.format === 'wav' ? 'wav' : 'mp3',
      Data: buffer.toString('base64'), DataLen: buffer.length, WordInfo: 0,
    });
    const text = String(response.Result || '').trim();
    return ok({ text, recognitionId: event.recognitionId, noSpeech: !text });
  } catch (error) {
    console.error('speech recognition failed', {
      recognitionId: event.recognitionId,
      code: error.code,
      requestId: error.requestId,
      error: error.message,
    });
    return fail('ASR_ERROR', '语音识别服务暂时不可用。');
  }
};
