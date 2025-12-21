'use strict';
const uniIdCommon = require('uni-id-common');

exports.main = async (event, context) => {
  const uniId = uniIdCommon.createInstance({
    context
  });
  
  const {
    username,
    password,
    nickname,
    avatar = '',
    gender = 0,
    mobile = '',
    email = '',
    invite_code = '',
    captcha = ''
  } = event;
  
  // 参数验证
  if (!username) {
    return {
      code: 400,
      message: '用户名不能为空',
      data: null
    };
  }
  
  if (!password) {
    return {
      code: 400,
      message: '密码不能为空',
      data: null
    };
  }
  
  if (password.length < 6) {
    return {
      code: 400,
      message: '密码长度至少6位',
      data: null
    };
  }
  
  try {
    // 构建注册参数
    const registerParams = {
      username,
      password,
      nickname: nickname || username,
      avatar,
      gender,
      mobile,
      email,
      inviteCode: invite_code,
      captcha
    };
    
    // 添加注册环境信息
    registerParams.context = {
      appid: context.APPID || '',
      uniPlatform: context.UNI_PLATFORM || '',
      osName: context.OS_NAME || '',
      clientIP: context.CLIENTIP || '',
      channel: context.CHANNEL || '',
      appVersion: context.APP_VERSION || ''
    };
    
    // 调用 uni-id 注册
    const result = await uniId.register(registerParams);
    
    return result;
  } catch (error) {
    console.error('[Register Error]', error);
    return {
      code: 500,
      message: '注册失败，请稍后重试',
      data: null
    };
  }
};