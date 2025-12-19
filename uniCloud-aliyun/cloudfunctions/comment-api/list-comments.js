'use strict';
const db = uniCloud.database();

exports.main = async (event, context) => {
  const { contentId, page = 1, pageSize = 10 } = event;
  const userId = context.auth.uid;
  
  if (!contentId) return { code: 400, message: '需要内容ID' };
  
  try {
    // 检查内容是否存在
    const content = await db.collection('contents').doc(contentId).get();
    if (!content.data[0]) return { code: 404, message: '内容不存在' };
    
    const contentData = content.data[0];
    
    // 检查内容可见性
    if (contentData.visibility === 'private' && contentData.user_id !== userId) {
      return { code: 403, message: '无法查看私密内容的评论' };
    }
    
    // 计算分页
    const skip = (page - 1) * pageSize;
    
    // 查询评论（按时间倒序）
    const commentsResult = await db.collection('comments')
      .where({ content_id: contentId, status: 'published' })
      .orderBy('created_at', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get();
    
    // 获取评论总数
    const countResult = await db.collection('comments')
      .where({ content_id: contentId, status: 'published' })
      .count();
    
    return {
      code: 200,
      data: {
        comments: commentsResult.data,
        average_rating: contentData.stats?.average_rating || 0,
        rating_count: contentData.stats?.rating_count || 0,
        total: countResult.total,
        page: page,
        pageSize: pageSize,
        hasMore: (page * pageSize) < countResult.total
      }
    };
    
  } catch (error) {
    console.error('获取评论失败:', error);
    return { code: 500, message: '获取失败' };
  }
};