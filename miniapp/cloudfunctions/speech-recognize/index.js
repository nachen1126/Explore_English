'use strict';
const cloud = require('wx-server-sdk');
const tencentcloud = require('tencentcloud-sdk-nodejs-asr');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const ok = data => ({ ok: true, data });
const fail = (error, message) => ({ ok: false, error, message });

exports.main = async event => {
  const { OPENID } = cloud.getWXContext();
  if (!OPENID) return fail('UNAUTHENTICATED', 'A verified WeChat identity is required.');
  if (!event.fileID || typeof event.recognitionId !== 'string') return fail('INVALID_REQUEST', 'Missing recording data.');
  const { TENCENT_SECRET_ID, TENCENT_SECRET_KEY, TENCENT_ASR_PROJECT_ID, TENCENT_ASR_REGION = 'ap-shanghai' } = process.env;
  if (!TENCENT_SECRET_ID || !TENCENT_SECRET_KEY || !TENCENT_ASR_PROJECT_ID) {
    return fail('ASR_NOT_CONFIGURED', 'Speech recognition is not configured; use the text answer instead.');
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
      ProjectId: Number(TENCENT_ASR_PROJECT_ID), SubServiceType: 2, EngSerViceType: '16k_en',
      SourceType: 1, VoiceFormat: event.format === 'wav' ? 'wav' : 'mp3',
      Data: buffer.toString('base64'), DataLen: buffer.length, WordInfo: 0,
    });
    const text = String(response.Result || '').trim();
    return ok({ text, recognitionId: event.recognitionId, noSpeech: !text });
  } catch (error) {
    console.error('speech recognition failed', { recognitionId: event.recognitionId, error: error.message });
    return fail('ASR_ERROR', 'Speech recognition is temporarily unavailable.');
  }
};
