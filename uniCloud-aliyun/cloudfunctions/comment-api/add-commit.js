'use strict';
const db = uniCloud.database();

exports.main = async (event, context) => {
  const { contentId, commentContent, rating } = event;
  const userId = context.auth.uid;
  
  if (!userId) return { code: 401, message: '请先登录' };
  if (!contentId || !commentContent) return { code: 400, message: '参数不全' };
  if (rating && (rating < 1 || rating > 5)) return { code: 400, message: '评分1-5分' };
  
  try {
    // 检查内容是否存在
    const content = await db.collection('contents').doc(contentId).get();
    if (!content.data[0]) return { code: 404, message: '内容不存在' };
    
    const contentData = content.data[0];
    
    // 检查内容可见性
    if (contentData.visibility === 'private' && contentData.user_id !== userId) {
      return { code: 403, message: '无法评论私密内容' };
    }
    
    // 创建评论数据
    const commentData = {
      content_id: contentId,
      content_user_id: contentData.user_id,
      user_id: userId,
      comment_content: commentContent,
      rating: rating || null,
      like_count: 0,
      reply_count: 0,
      status: 'published',
      created_at: Date.now(),
      updated_at: Date.now(),
      comment_ip: context.CLIENTIP || '未知'
    };
    
    // 添加评论
    const result = await db.collection('comments').add(commentData);
    
    // 更新内容的评论数
    const updateData = {
      updated_at: Date.now()
    };
    
    // 使用传统方式更新统计
    const contentResult = await db.collection('contents').doc(contentId).get();
    const currentContent = contentResult.data[0] || {};
    const currentStats = currentContent.stats || {};
    
    // 更新评论数
    const newCommentCount = (currentStats.comment_count || 0) + 1;
    updateData['stats.comment_count'] = newCommentCount;
    
    // 如果有评分，更新评分
    if (rating) {
      const currentRatingCount = currentStats.rating_count || 0;
      const currentAvg = currentStats.average_rating || 0;
      
      const newRatingCount = currentRatingCount + 1;
      const newAvg = ((currentAvg * currentRatingCount) + rating) / newRatingCount;
      
      updateData['stats.average_rating'] = newAvg;
      updateData['stats.rating_count'] = newRatingCount;
    }
    
    await db.collection('contents').doc(contentId).update(updateData);
    
    return {
      code: 200,
      message: '评论成功',
      data: { 
        commentId: result.id,
        commentData: {
          ...commentData,
          _id: result.id
        }
      }
    };
    
  } catch (error) {
    console.error('添加评论失败:', error);
    return { code: 500, message: '评论失败' };
  }
};