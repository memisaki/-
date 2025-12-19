'use strict';
const db = uniCloud.database();

exports.main = async (event, context) => {
  const { commentId } = event;
  const userId = context.auth.uid;
  
  if (!userId) return { code: 401, message: '请先登录' };
  if (!commentId) return { code: 400, message: '需要评论ID' };
  
  try {
    // 获取评论信息
    const comment = await db.collection('comments').doc(commentId).get();
    if (!comment.data[0]) return { code: 404, message: '评论不存在' };
    
    const commentData = comment.data[0];
    
    // 检查权限
    if (commentData.user_id !== userId) {
      return { code: 403, message: '只能删除自己的评论' };
    }
    
    // 删除评论
    await db.collection('comments').doc(commentId).remove();
    
    // 更新内容的评论数和评分
    const contentId = commentData.content_id;
    const contentResult = await db.collection('contents').doc(contentId).get();
    const currentContent = contentResult.data[0] || {};
    const currentStats = currentContent.stats || {};
    
    // 计算新的统计数据
    let updateData = {
      updated_at: Date.now()
    };
    
    // 更新评论数
    const newCommentCount = Math.max(0, (currentStats.comment_count || 0) - 1);
    updateData['stats.comment_count'] = newCommentCount;
    
    // 如果有评分，更新评分
    if (commentData.rating) {
      const currentRatingCount = currentStats.rating_count || 0;
      const currentAvg = currentStats.average_rating || 0;
      
      if (currentRatingCount > 1) {
        const newRatingCount = currentRatingCount - 1;
        const newAvg = ((currentAvg * currentRatingCount) - commentData.rating) / newRatingCount;
        updateData['stats.average_rating'] = newAvg;
        updateData['stats.rating_count'] = newRatingCount;
      } else {
        updateData['stats.average_rating'] = 0;
        updateData['stats.rating_count'] = 0;
      }
    }
    
    await db.collection('contents').doc(contentId).update(updateData);
    
    return { code: 200, message: '删除成功' };
    
  } catch (error) {
    console.error('删除评论失败:', error);
    return { code: 500, message: '删除失败' };
  }
};