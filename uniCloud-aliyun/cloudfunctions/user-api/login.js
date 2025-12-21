'use strict';
const uniIdCommon = require('uni-id-common');

exports.main = async (event, context) => {
  const uniId = uniIdCommon.createInstance({
    context
  });
  
  const { 
    username, 
    password,
    captcha,
    auto_register = false,
    need_permission = false
  } = event;
  
  // 参数验证
  if (!username) {
    return {
      code: 400,
      message: '用户名/邮箱/手机号不能为空',
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
  
  try {
    // 构建登录参数
    const loginParams = {
      username,
      password,
      needPermission: need_permission,
      autoRegister: auto_register
    };
    
    // 如果有验证码
    if (captcha) {
      loginParams.captcha = captcha;
    }
    
    // 调用 uni-id 登录
    const result = await uniId.login(loginParams);
    
    // 更新登录信息
    if (result.code === 0) {
      await updateLoginRecord(result.uid, context);
    }
    
    return result;
  } catch (error) {
    console.error('[Login Error]', error);
    return {
      code: 500,
      message: '登录失败，请稍后重试',
      data: null
    };
  }
};

// 更新登录记录
async function updateLoginRecord(uid, context) {
  try {
    const db = uniCloud.database();
    const collection = db.collection('uni-id-users');
    
    await collection.doc(uid).update({
      last_login_date: new Date(),
      last_login_ip: context.CLIENTIP || '',
      updated_at: new Date()
    });
  } catch (error) {
    console.error('[Update Login Record Error]', error);
  }
}