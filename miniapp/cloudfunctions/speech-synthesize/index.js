'use strict';
const cloud = require('wx-server-sdk');
const tencentcloud = require('tencentcloud-sdk-nodejs-tts');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const words = {
  'kitchen-fridge': 'fridge', 'kitchen-sink': 'sink', 'kitchen-oven': 'oven', 'kitchen-hob': 'hob',
  'kitchen-kettle': 'kettle', 'kitchen-pan': 'pan', 'kitchen-chopping-board': 'chopping board',
  'kitchen-cupboard': 'cupboard', 'kitchen-spatula': 'spatula', 'kitchen-microwave': 'microwave',
};
const ok = data => ({ ok: true, data });
const fail = (error, message) => ({ ok: false, error, message });

exports.main = async event => {
  const { OPENID } = cloud.getWXContext();
  if (!OPENID) return fail('UNAUTHENTICATED', 'A verified WeChat identity is required.');
  const text = words[event.vocabularyId];
  if (!text) return fail('INVALID_WORD', 'Unknown Kitchen vocabulary ID.');
  const { TENCENT_SECRET_ID, TENCENT_SECRET_KEY, TENCENT_TTS_PROJECT_ID = '0', TENCENT_TTS_REGION = 'ap-shanghai' } = process.env;
  if (!TENCENT_SECRET_ID || !TENCENT_SECRET_KEY) return fail('TTS_NOT_CONFIGURED', 'Pronunciation audio is not configured; use the visible word prompt.');
  const cloudPath = `pronunciation/kitchen-v1/${event.vocabularyId}.mp3`;
  try {
    const Client = tencentcloud.tts.v20190823.Client;
    const client = new Client({ credential: { secretId: TENCENT_SECRET_ID, secretKey: TENCENT_SECRET_KEY },
      region: TENCENT_TTS_REGION, profile: { httpProfile: { endpoint: 'tts.tencentcloudapi.com' } } });
    const generated = await client.TextToVoice({ Text: text, SessionId: `${event.vocabularyId}-${Date.now()}`,
      ProjectId: Number(TENCENT_TTS_PROJECT_ID), ModelType: 1, VoiceType: 0, PrimaryLanguage: 2,
      SampleRate: 16000, Codec: 'mp3', Speed: -0.5, Volume: 0 });
    if (!generated.Audio) return fail('TTS_EMPTY', 'Pronunciation service returned no audio.');
    const uploaded = await cloud.uploadFile({ cloudPath, fileContent: Buffer.from(generated.Audio, 'base64') });
    return ok({ fileID: uploaded.fileID });
  } catch (error) {
    console.error('speech synthesis failed', { vocabularyId: event.vocabularyId, error: error.message });
    return fail('TTS_ERROR', 'Pronunciation audio is temporarily unavailable.');
  }
};
