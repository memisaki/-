'use strict';
const uniCloud = require('uni-cloud-sdk');

exports.main = async (event, context) => {
  const db = uniCloud.database();
  const collection = db.collection('uni-id-users');
  
  const { user_id, include_sensitive = false } = event;
  const targetUserId = user_id || context.UID;
  
  if (!targetUserId) {
    return {
      code: 401,
      message: '请先登录或指定用户ID',
      data: null
    };
  }
  
  try {
    // 获取用户信息
    const result = await collection.doc(targetUserId).get();
    
    if (!result.data || result.data.length === 0) {
      return {
        code: 404,
        message: '用户不存在',
        data: null
      };
    }
    
    let userInfo = result.data[0];
    
    // 检查权限：用户只能查看自己的敏感信息
    const isSelf = context.UID === targetUserId;
    const isAdmin = await checkAdminPermission(context.UID);
    
    // 过滤敏感信息
    if (!isSelf && !isAdmin && !include_sensitive) {
      userInfo = filterSensitiveInfo(userInfo);
    }
    
    // 获取用户统计数据
    const userStats = await getUserStatistics(targetUserId);
    
    return {
      code: 200,
      message: '获取成功',
      data: {
        profile: userInfo,
        stats: userStats
      }
    };
  } catch (error) {
    console.error('[Get Profile Error]', error);
    return {
      code: 500,
      message: '获取用户资料失败',
      data: null
    };
  }
};

// 过滤敏感信息
function filterSensitiveInfo(userInfo) {
  const sensitiveFields = [
    'password',
    'password_secret_version',
    'token',
    'wx_unionid',
    'wx_openid',
    'ali_openid',
    'apple_openid',
    'third_party',
    'dcloud_appid',
    'realname_auth',
    'inviter_uid',
    'my_invite_code',
    'identities'
  ];
  
  const filtered = { ...userInfo };
  sensitiveFields.forEach(field => {
    delete filtered[field];
  });
  
  // 部分隐藏手机号和邮箱
  if (filtered.mobile) {
    filtered.mobile = filtered.mobile.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
  }
  
  if (filtered.email) {
    const [name, domain] = filtered.email.split('@');
    if (name.length > 2) {
      filtered.email = name.substring(0, 2) + '****@' + domain;
    }
  }
  
  return filtered;
}

// 获取用户统计数据
async function getUserStatistics(userId) {
  const db = uniCloud.database();
  
  try {
    const [contentsCount, commentsCount, likesCount] = await Promise.all([
      db.collection('contents')
        .where({ user_id: userId, deleted_at: null, is_draft: false })
        .count(),
      db.collection('comments')
        .where({ user_id: userId, deleted_at: null })
        .count(),
      db.collection('content_likes')
        .where({ user_id: userId })
        .count()
    ]);
    
    return {
      content_count: contentsCount.total,
      comment_count: commentsCount.total,
      like_count: likesCount.total
    };
  } catch (error) {
    console.error('[Get User Stats Error]', error);
    return {
      content_count: 0,
      comment_count: 0,
      like_count: 0
    };
  }
}

// 检查管理员权限
async function checkAdminPermission(userId) {
  try {
    const db = uniCloud.database();
    const userCollection = db.collection('uni-id-users');
    
    const result = await userCollection.doc(userId).get();
    if (!result.data || result.data.length === 0) return false;
    
    const user = result.data[0];
    return user.role && Array.isArray(user.role) && 
           user.role.some(role => ['admin', 'moderator'].includes(role));
  } catch (error) {
    return false;
  }
}