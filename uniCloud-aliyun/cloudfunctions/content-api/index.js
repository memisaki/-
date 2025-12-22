'use strict';

exports.main = async (event, context) => {
  const { action, data = {} } = event;
  
  try {
    console.log(`[Content API] Action: ${action}, User: ${context.UID || 'anonymous'}`);
    
    switch (action) {
      // 创建内容（支持图片、视频、文本）
      case 'create':
        const createContent = require('./create-content.js');
        return await createContent.main(data, context);
      
      // 获取内容（查看、搜索）
      case 'get':
        const getContent = require('./get-content.js');
        return await getContent.main(data, context);
      
      // 修改内容
      case 'update':
        const updateContent = require('./update-content.js');
        return await updateContent.main(data, context);
      
      // 删除内容
      case 'delete':
        const deleteContent = require('./delete-content.js');
        return await deleteContent.main(data, context);
      
      default:
        return {
          code: 400,
          message: '无效的操作类型',
          data: null
        };
    }
  } catch (error) {
    console.error(`[Content API Error] ${error.message}`, error);
    return {
      code: 500,
      message: '服务器内部错误',
      data: null
    };
  }
};