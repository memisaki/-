'use strict';
const uniIdCommon = require('uni-id-common');

exports.main = async (event, context) => {
  const uniId = uniIdCommon.createInstance({
    context
  });
  
  const { 
    old_password, 
    new_password,
    confirm_password
  } = event;
  
  if (!context.UID) {
    return {
      code: 401,
      message: '请先登录',
      data: null
    };
  }
  
  // 参数验证
  if (!old_password) {
    return {
      code: 400,
      message: '原密码不能为空',
      data: null
    };
  }
  
  if (!new_password) {
    return {
      code: 400,
      message: '新密码不能为空',
      data: null
    };
  }
  
  if (new_password.length < 6) {
    return {
      code: 400,
      message: '新密码长度至少6位',
      data: null
    };
  }
  
  if (new_password !== confirm_password) {
    return {
      code: 400,
      message: '两次输入的新密码不一致',
      data: null
    };
  }
  
  if (old_password === new_password) {
    return {
      code: 400,
      message: '新密码不能与原密码相同',
      data: null
    };
  }
  
  try {
    // 调用 uni-id 修改密码
    const result = await uniId.updatePwd({
      uid: context.UID,
      oldPassword: old_password,
      newPassword: new_password
    });
    
    if (result.code === 0) {
      // 记录密码修改日志
      await recordPasswordChange(context.UID, context);
    }
    
    return result;
  } catch (error) {
    console.error('[Update Password Error]', error);
    return {
      code: 500,
      message: '修改密码失败，请稍后重试',
      data: null
    };
  }
};

// 记录密码修改日志
async function recordPasswordChange(uid, context) {
  try {
    const db = uniCloud.database();
    const collection = db.collection('password_change_logs');
    
    await collection.add({
      user_id: uid,
      changed_at: new Date(),
      client_ip: context.CLIENTIP || '',
      user_agent: context.USER_AGENT || ''
    });
  } catch (error) {
    console.error('[Record Password Change Error]', error);
  }
}