'use strict';
const uniCloud = require('uni-cloud-sdk');

exports.main = async (event, context) => {
  const db = uniCloud.database();
  const collection = db.collection('contents');
  const userCollection = db.collection('uni-id-users');
  
  const {
    title,
    text_content = '',
    content_type = 'text',
    media_files = [],
    tags = [],
    categories = [],
    visibility = 'public',
    share_mode = 'view_only',
    friend_ids = [],
    location = null,
    metadata = {},
    is_draft = false,
    scheduled_time = null,
    expire_time = null
  } = event;
  
  // 获取当前用户信息
  const userRes = await userCollection.doc(context.UID).get();
  if (!userRes.data || userRes.data.length === 0) {
    return {
      code: 401,
      message: '用户不存在或未登录',
      data: null
    };
  }
  
  // 验证必要参数
  if (!title && !text_content && media_files.length === 0) {
    return {
      code: 400,
      message: '标题、文本内容或媒体文件至少需要一项',
      data: null
    };
  }
  
  // 计算元数据
  const wordCount = text_content.length;
  const readingTime = Math.ceil(wordCount / 300); // 按每分钟300字计算
  
  // 构建内容对象
  const contentData = {
    user_id: context.UID,
    title: title || `未命名内容_${Date.now()}`,
    content_type,
    text_content,
    media_files: media_files.map(file => ({
      ...file,
      processed: false,
      ai_analysis: {
        labels: [],
        description: '',
        nsfw_score: 0
      }
    })),
    tags: tags.slice(0, 10), // 最多10个标签
    categories,
    visibility,
    share_mode,
    friend_ids: visibility === 'friends_only' ? friend_ids : [],
    stats: {
      view_count: 0,
      like_count: 0,
      comment_count: 0,
      average_rating: 0,
      rating_count: 0,
      share_count: 0,
      download_count: 0
    },
    ai_processed: false,
    ai_summary: '',
    ai_tags: [],
    content_check: {
      status: visibility === 'private' ? 'passed' : 'pending',
      sensitive_words: [],
      check_time: null,
      reject_reason: ''
    },
    location: location || null,
    metadata: {
      word_count: wordCount,
      reading_time: readingTime,
      language: 'zh-CN',
      color_palette: [],
      ...metadata
    },
    is_draft,
    scheduled_time: scheduled_time ? new Date(scheduled_time) : null,
    expire_time: expire_time ? new Date(expire_time) : null,
    created_at: new Date(),
    updated_at: new Date(),
    published_at: is_draft || scheduled_time ? null : new Date(),
    deleted_at: null
  };
  
  try {
    // 保存到数据库
    const result = await collection.add(contentData);
    
    // 如果是草稿，不进行AI处理
    if (!is_draft && !scheduled_time && visibility !== 'private') {
      // 异步触发AI处理
      await uniCloud.callFunction({
        name: 'content-api',
        data: {
          action: 'ai_process',
          data: {
            content_id: result.id,
            media_files: contentData.media_files,
            text_content: contentData.text_content
          }
        }
      });
      
      // 异步触发内容审核
      await uniCloud.callFunction({
        name: 'content-check-service',
        data: {
          action: 'check_content',
          data: {
            content_id: result.id,
            text: text_content,
            media_urls: media_files.map(f => f.url)
          }
        }
      });
    }
    
    return {
      code: 200,
      message: is_draft ? '草稿保存成功' : 
               scheduled_time ? '定时发布设置成功' : 
               '内容创建成功',
      data: {
        content_id: result.id,
        ...contentData,
        _id: result.id
      }
    };
  } catch (error) {
    console.error('Create content error:', error);
    return {
      code: 500,
      message: '创建内容失败',
      data: null
    };
  }
};