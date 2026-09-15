'use strict';
const cloud = require('wx-server-sdk');
const { handlePronunciation } = require('./handler');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = handlePronunciation;
