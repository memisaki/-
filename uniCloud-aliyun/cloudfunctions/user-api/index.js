'use strict';
const uniCloud = require('uni-cloud-sdk');
const uniIdCommon = require('uni-id-common');

exports.main = async (event, context) => {
  const { action, data = {} } = event;
  
  try {
    // 用户认证相关 - 直接调用对应文件
    if (['login', 'register', 'logout', 'update_password'].includes(action)) {
      const module = require(`./${action}.js`);
      return await module.main(event, context);
    }
    
    // 其他功能转到主逻辑处理
    return await handleAction(action, data, context);
    
  } catch (error) {
    console.error(`[User API Error] ${action}:`, error);
    return {
      code: 500,
      message: '服务器内部错误',
      data: null
    };
  }
};

// 统一处理其他action
async function handleAction(action, data, context) {
  const db = uniCloud.database();
  const userCollection = db.collection('uni-id-users');
  
  switch (action) {
    // 用户资料
    case 'get_profile':
      return await handleGetProfile(data, context, userCollection);
    case 'update_profile':
      return await handleUpdateProfile(data, context, userCollection);
    
    // 管理员功能
    case 'admin_list_users':
      return await handleAdminList(data, context, userCollection);
    case 'admin_update_user':
      return await handleAdminUpdate(data, context, userCollection);
    case 'admin_disable_user':
      return await handleAdminDisable(data, context, userCollection);
    
    // 实名认证
    case 'submit_realname_auth':
      return await handleSubmitRealname(data, context, userCollection);
    
    default:
      return {
        code: 400,
        message: '无效的操作类型',
        data: null
      };
  }
}

// === 核心处理函数 ===

// 获取用户资料
async function handleGetProfile(data, context, collection) {
  const { user_id } = data;
  const targetId = user_id || context.UID;
  
  if (!targetId) return { code: 401, message: '请先登录', data: null };
  
  const result = await collection.doc(targetId).get();
  if (!result.data?.length) return { code: 404, message: '用户不存在', data: null };
  
  return {
    code: 200,
    message: '获取成功',
    data: filterUserInfo(result.data[0], context.UID === targetId)
  };
}

// 更新用户资料
async function handleUpdateProfile(data, context, collection) {
  if (!context.UID) return { code: 401, message: '请先登录', data: null };
  
  const { nickname, gender, avatar, mobile, email } = data;
  const updateData = { updated_at: new Date() };
  
  if (nickname !== undefined) updateData.nickname = nickname;
  if (gender !== undefined) updateData.gender = gender;
  if (avatar !== undefined) updateData.avatar = avatar;
  if (mobile !== undefined) updateData.mobile = mobile;
  if (email !== undefined) updateData.email = email;
  
  await collection.doc(context.UID).update(updateData);
  return { code: 200, message: '更新成功', data: null };
}

// 管理员用户列表
async function handleAdminList(data, context, collection) {
  const isAdmin = await checkAdminPermission(context.UID);
  if (!isAdmin) return { code: 403, message: '无权操作', data: null };
  
  const { page = 1, page_size = 20 } = data;
  const offset = (page - 1) * page_size;
  
  const query = collection.orderBy('register_date', 'desc');
  const [listResult, totalResult] = await Promise.all([
    query.skip(offset).limit(page_size).get(),
    query.count()
  ]);
  
  return {
    code: 200,
    message: '获取成功',
    data: {
      list: listResult.data.map(user => filterUserInfo(user, false)),
      total: totalResult.total,
      page,
      page_size
    }
  };
}

// 管理员更新用户
async function handleAdminUpdate(data, context, collection) {
  const isAdmin = await checkAdminPermission(context.UID);
  if (!isAdmin) return { code: 403, message: '无权操作', data: null };
  
  const { user_id, update_data } = data;
  if (!user_id || !update_data) return { code: 400, message: '参数错误', data: null };
  
  await collection.doc(user_id).update({
    ...update_data,
    updated_at: new Date()
  });
  
  return { code: 200, message: '更新成功', data: null };
}

// 管理员禁用用户
async function handleAdminDisable(data, context, collection) {
  const isAdmin = await checkAdminPermission(context.UID);
  if (!isAdmin) return { code: 403, message: '无权操作', data: null };
  
  const { user_id, status } = data;
  if (!user_id || status === undefined) return { code: 400, message: '参数错误', data: null };
  
  await collection.doc(user_id).update({
    status,
    updated_at: new Date()
  });
  
  return { code: 200, message: '操作成功', data: null };
}

// 提交实名认证
async function handleSubmitRealname(data, context, collection) {
  if (!context.UID) return { code: 401, message: '请先登录', data: null };
  
  const { real_name, identity, id_card_front, id_card_back } = data;
  if (!real_name || !identity) return { code: 400, message: '请填写完整信息', data: null };
  
  const realnameAuth = {
    type: 0,
    auth_status: 1,
    real_name,
    identity,
    id_card_front: id_card_front || '',
    id_card_back: id_card_back || ''
  };
  
  await collection.doc(context.UID).update({
    realname_auth: realnameAuth,
    updated_at: new Date()
  });
  
  return { code: 200, message: '提交成功', data: null };
}

// === 工具函数 ===

// 过滤用户敏感信息
function filterUserInfo(user, isSelf) {
  if (isSelf) return user;
  
  const { password, password_secret_version, token, third_party, ...filtered } = user;
  
  // 部分隐藏敏感信息
  if (filtered.mobile) {
    filtered.mobile = filtered.mobile.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
  }
  if (filtered.email) {
    const [name, domain] = filtered.email.split('@');
    filtered.email = name.substring(0, 2) + '****@' + domain;
  }
  
  return filtered;
}

// 检查管理员权限
async function checkAdminPermission(userId) {
  try {
    const db = uniCloud.database();
    const user = await db.collection('uni-id-users').doc(userId).get();
    const roles = user.data?.[0]?.role || [];
    return roles.includes('admin') || roles.includes('moderator');
  } catch {
    return false;
  }
}