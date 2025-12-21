'use strict';
const uniCloud = require('uni-cloud-sdk');
const db = uniCloud.database();
const dbCmd = db.command;

exports.main = async (event, context) => {
  const { action, data = {} } = event;
  const collection = db.collection('contents');
  
  try {
    // 记录操作日志
    console.log(`[Content API] Action: ${action}, User: ${context.UID || 'anonymous'}`);
    
    switch (action) {
      // 内容管理
      case 'create':
        return await createContent(collection, data, context);
      case 'get':
        return await getContent(collection, data, context);
      case 'update':
        return await updateContent(collection, data, context);
      case 'delete':
        return await deleteContent(collection, data, context);
      case 'list':
        return await listContents(collection, data, context);
      case 'search':
        return await searchContents(collection, data, context);
      
      // 审核相关
      case 'submit_review':
        return await submitForReview(collection, data, context);
      case 'approve':
        return await approveContent(collection, data, context);
      case 'reject':
        return await rejectContent(collection, data, context);
      
      // 统计相关
      case 'view':
        return await recordView(collection, data, context);
      case 'like':
        return await toggleLike(collection, data, context);
      case 'comment':
        return await updateCommentCount(collection, data, context);
      case 'download':
        return await recordDownload(collection, data, context);
      
      // 草稿管理
      case 'save_draft':
        return await saveDraft(collection, data, context);
      case 'get_drafts':
        return await getDrafts(collection, data, context);
      case 'publish_draft':
        return await publishDraft(collection, data, context);
      
      // AI相关
      case 'ai_process':
        return await aiProcessContent(collection, data, context);
      case 'ai_summarize':
        return await aiSummarizeContent(collection, data, context);
      
      // 定时任务
      case 'publish_scheduled':
        return await publishScheduledContents(collection, data, context);
      
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
      message: `服务器内部错误: ${error.message}`,
      data: null
    };
  }
};