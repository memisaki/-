'use strict';
const db = uniCloud.database();

exports.main = async (event, context) => {
  const { contentId } = event;
  const userId = context.auth.uid;
  
  if (!contentId) return { code: 400, message: '需要内容ID' };
  
  try {
    // 检查内容是否存在
    const content = await db.collection('contents').doc(contentId).get();
    if (!content.data[0]) return { code: 404, message: '内容不存在' };
    
    const contentData = content.data[0];
    
    // 检查内容可见性
    if (contentData.visibility === 'private' && contentData.user_id !== userId) {
      return { code: 403, message: '无法查看私密内容的评分' };
    }
    
    // 获取所有评分评论
    const ratingStats = await db.collection('comments')
      .where({ content_id: contentId, status: 'published' })
      .field({ rating: true, user_id: true })
      .get();
    
    // 计算评分分布
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let userRating = null;
    
    ratingStats.data.forEach(item => {
      const rating = item.rating;
      if (rating >= 1 && rating <= 5) {
        distribution[rating]++;
      }
      
      // 如果是当前用户，记录评分
      if (userId && item.user_id === userId && rating !== null) {
        userRating = rating;
      }
    });
    
    return {
      code: 200,
      data: {
        content_id: contentId,
        average_rating: contentData.stats?.average_rating || 0,
        rating_count: contentData.stats?.rating_count || 0,
        rating_distribution: distribution,
        user_rating: userRating,
        comment_count: contentData.stats?.comment_count || 0
      }
    };
    
  } catch (error) {
    console.error('获取评分失败:', error);
    return { code: 500, message: '获取失败' };
  }
};