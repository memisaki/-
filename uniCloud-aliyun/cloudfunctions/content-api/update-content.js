'use strict';
const uniCloud = require('uni-cloud-sdk');

exports.main = async (event, context) => {
  const db = uniCloud.database();
  const collection = db.collection('contents');
  const dbCmd = db.command;
  
  const { content_id, update_data } = event;
  
  if (!content_id) {
    return {
      code: 400,
      message: '内容ID不能为空',
      data: null
    };
  }
  
  // 获取原始内容
  const originalContent = await collection.doc(content_id).get();
  if (!originalContent.data || originalContent.data.length === 0) {
    return {
      code: 404,
      message: '内容不存在',
      data: null
    };
  }
  
  const content = originalContent.data[0];
  
  // 权限检查：只能更新自己的内容
  if (content.user_id !== context.UID) {
    // 检查是否是管理员
    const userCollection = db.collection('uni-id-users');
    const user = await userCollection.doc(context.UID).get();
    const userData = user.data[0];
    
    if (!userData.role || !['admin', 'editor'].includes(userData.role)) {
      return {
        code: 403,
        message: '无权更新此内容',
        data: null
      };
    }
  }
  
  // 构建更新数据
  const updateData = {
    updated_at: new Date(),
    ...update_data
  };
  
  // 处理媒体文件更新
  if (update_data.media_files) {
    updateData.media_files = update_data.media_files.map(file => ({
      ...file,
      processed: file.processed || false
    }));
    updateData.ai_processed = false; // 重置AI处理状态
  }
  
  // 如果从草稿发布
  if (update_data.is_draft === false && content.is_draft === true) {
    updateData.published_at = new Date();
    updateData.is_draft = false;
    
    // 触发AI处理和内容审核
    await uniCloud.callFunction({
      name: 'content-api',
      data: {
        action: 'ai_process',
        data: {
          content_id,
          media_files: updateData.media_files || content.media_files,
          text_content: updateData.text_content || content.text_content
        }
      }
    });
  }
  
  // 如果修改了可见性，需要重新审核
  if (update_data.visibility && 
      update_data.visibility !== 'private' && 
      update_data.visibility !== content.visibility) {
    updateData.content_check = {
      status: 'pending',
      sensitive_words: [],
      check_time: null,
      reject_reason: ''
    };
  }
  
  try {
    await collection.doc(content_id).update(updateData);
    
    // 获取更新后的完整数据
    const updatedContent = await collection.doc(content_id).get();
    
    return {
      code: 200,
      message: '内容更新成功',
      data: updatedContent.data[0]
    };
  } catch (error) {
    console.error('Update content error:', error);
    return {
      code: 500,
      message: '更新内容失败',
      data: null
    };
  }
};