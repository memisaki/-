'use strict';
const uniCloud = require('uni-cloud-sdk');

exports.main = async (event, context) => {
  const db = uniCloud.database();
  const collection = db.collection('contents');
  
  const { content_id, permanent = false } = event;
  
  if (!content_id) {
    return {
      code: 400,
      message: '内容ID不能为空',
      data: null
    };
  }
  
  // 获取内容
  const contentRes = await collection.doc(content_id).get();
  if (!contentRes.data || contentRes.data.length === 0) {
    return {
      code: 404,
      message: '内容不存在',
      data: null
    };
  }
  
  const content = contentRes.data[0];
  
  // 权限检查：只能删除自己的内容
  if (content.user_id !== context.UID) {
    // 检查是否是管理员
    const userCollection = db.collection('uni-id-users');
    const user = await userCollection.doc(context.UID).get();
    const userData = user.data[0];
    
    if (!userData.role || !['admin', 'editor'].includes(userData.role)) {
      return {
        code: 403,
        message: '无权删除此内容',
        data: null
      };
    }
  }
  
  try {
    if (permanent) {
      // 永久删除
      await collection.doc(content_id).remove();
      
      // 删除相关的媒体文件（需要调用OSS服务）
      if (content.media_files && content.media_files.length > 0) {
        await uniCloud.callFunction({
          name: 'oss-service',
          data: {
            action: 'delete_files',
            data: {
              urls: content.media_files.map(f => f.url)
            }
          }
        });
      }
      
      return {
        code: 200,
        message: '内容已永久删除',
        data: null
      };
    } else {
      // 软删除
      await collection.doc(content_id).update({
        deleted_at: new Date(),
        updated_at: new Date()
      });
      
      return {
        code: 200,
        message: '内容已移动到回收站',
        data: null
      };
    }
  } catch (error) {
    console.error('Delete content error:', error);
    return {
      code: 500,
      message: '删除内容失败',
      data: null
    };
  }
};