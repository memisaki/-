'use strict';
const uniCloud = require('uni-cloud-sdk');

exports.main = async (event, context) => {
  const db = uniCloud.database();
  const collection = db.collection('contents');
  const userCollection = db.collection('uni-id-users');
  const dbCmd = db.command;
  
  const {
    content_id,
    action, // 'approve' 或 'reject'
    reject_reason = '',
    notes = '' // 审核备注
  } = event;
  
  // 1. 参数验证
  if (!content_id) {
    return {
      code: 400,
      message: '内容ID不能为空',
      data: null
    };
  }
  
  if (!action || !['approve', 'reject'].includes(action)) {
    return {
      code: 400,
      message: '操作类型必须为 approve 或 reject',
      data: null
    };
  }
  
  // 2. 权限验证 - 必须是管理员
  if (!context.UID) {
    return {
      code: 401,
      message: '请先登录',
      data: null
    };
  }
  
  // 获取用户信息，检查是否为管理员
  const userRes = await userCollection.doc(context.UID).get();
  if (!userRes.data || userRes.data.length === 0) {
    return {
      code: 401,
      message: '用户不存在',
      data: null
    };
  }
  
  const userInfo = userRes.data[0];
  const userRoles = userInfo.role || [];
  
  // 检查是否有审核权限
  if (!Array.isArray(userRoles) || 
      !userRoles.some(role => ['admin', 'moderator', 'editor'].includes(role))) {
    return {
      code: 403,
      message: '无权进行审核操作',
      data: null
    };
  }
  
  // 3. 获取内容信息
  const contentRes = await collection.doc(content_id).get();
  if (!contentRes.data || contentRes.data.length === 0) {
    return {
      code: 404,
      message: '内容不存在',
      data: null
    };
  }
  
  const content = contentRes.data[0];
  
  // 4. 检查内容当前状态
  if (content.content_check && content.content_check.status === action === 'approve' ? 'passed' : 'rejected') {
    return {
      code: 400,
      message: `内容已经是${action === 'approve' ? '已通过' : '已拒绝'}状态`,
      data: null
    };
  }
  
  // 5. 执行审核操作
  try {
    const updateData = {
      updated_at: new Date(),
      content_check: {
        status: action === 'approve' ? 'passed' : 'rejected',
        check_time: new Date(),
        reject_reason: action === 'reject' ? reject_reason : '',
        reviewer_id: context.UID,
        notes: notes || ''
      }
    };
    
    // 如果是拒绝操作，需要提供原因
    if (action === 'reject' && !reject_reason.trim()) {
      return {
        code: 400,
        message: '拒绝操作必须提供拒绝原因',
        data: null
      };
    }
    
    // 更新内容状态
    await collection.doc(content_id).update(updateData);
    
    // 6. 发送通知给内容创建者（可选）
    if (content.user_id && content.user_id !== context.UID) {
      await sendNotification(content.user_id, {
        type: 'content_review',
        content_id: content_id,
        action: action,
        reason: action === 'reject' ? reject_reason : '',
        reviewer: userInfo.nickname || userInfo.username,
        timestamp: new Date()
      });
    }
    
    // 7. 如果是审核通过，检查是否需要发布
    if (action === 'approve' && !content.published_at && !content.is_draft && !content.scheduled_time) {
      await collection.doc(content_id).update({
        published_at: new Date()
      });
    }
    
    // 8. 返回结果
    return {
      code: 200,
      message: action === 'approve' ? '审核通过' : '审核拒绝',
      data: {
        content_id: content_id,
        new_status: action === 'approve' ? 'passed' : 'rejected',
        reviewed_at: new Date(),
        reviewer: {
          id: context.UID,
          name: userInfo.nickname || userInfo.username
        }
      }
    };
    
  } catch (error) {
    console.error('[Approve Content Error]', error);
    return {
      code: 500,
      message: `审核操作失败: ${error.message}`,
      data: null
    };
  }
};

// 发送通知的函数
async function sendNotification(userId, notificationData) {
  try {
    // 可以调用通知服务
    await uniCloud.callFunction({
      name: 'notification-api',
      data: {
        action: 'create',
        data: {
          user_id: userId,
          type: notificationData.type,
          title: notificationData.action === 'approve' ? '内容审核通过' : '内容审核未通过',
          content: notificationData.action === 'approve' 
            ? `您的内容已通过审核，现已对外发布。` 
            : `您的内容审核未通过。原因：${notificationData.reason}`,
          data: {
            content_id: notificationData.content_id,
            action: notificationData.action
          },
          created_at: new Date()
        }
      }
    });
  } catch (error) {
    console.error('[Send Notification Error]', error);
    // 不因为通知失败而影响主要流程
  }
}