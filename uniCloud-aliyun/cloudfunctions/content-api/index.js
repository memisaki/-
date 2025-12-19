// index.js - 内容管理系统主云函数
'use strict';
const uniID = require('uni-id-common')
const db = uniCloud.database()
const dbCmd = db.command
const contentCollection = db.collection('contents')

exports.main = async (event, context) => {
  const { action, data } = event
  const uniIDIns = uniID.createInstance({ context })
  const payload = await uniIDIns.checkToken(event.uniIdToken)
  
  if (payload.code) {
    return payload
  }
  
  const uid = payload.uid
  const userInfo = payload.userInfo
  
  switch (action) {
    case 'createContent': // 创建内容
      return await createContent(data, uid)
    case 'updateContent': // 更新内容
      return await updateContent(data, uid)
    case 'deleteContent': // 删除内容
      return await deleteContent(data, uid)
    case 'getContentList': // 获取内容列表
      return await getContentList(data, uid)
    case 'getContentDetail': // 获取内容详情
      return await getContentDetail(data, uid)
    case 'getUserContents': // 获取用户内容列表
      return await getUserContents(data, uid)
    case 'searchContents': // 搜索内容
      return await searchContents(data, uid)
    case 'likeContent': // 点赞内容
      return await likeContent(data, uid)
    case 'collectContent': // 收藏内容
      return await collectContent(data, uid)
    case 'updateViewCount': // 更新浏览数
      return await updateViewCount(data, uid)
    case 'adminUpdateContent': // 管理员更新内容
      return await adminUpdateContent(data, userInfo)
    default:
      return {
        code: 400,
        message: '无效的操作'
      }
  }
}

// 创建内容
async function createContent(data, uid) {
  const { title, content, cover_image, images, category_id, tags, summary, status = 1 } = data
  
  if (!title || !content) {
    return {
      code: 400,
      message: '标题和内容不能为空'
    }
  }
  
  try {
    const contentData = {
      title,
      content,
      summary: summary || content.substring(0, 200),
      cover_image,
      images: images || [],
      category_id,
      tags: tags || [],
      user_id: uid,
      view_count: 0,
      like_count: 0,
      comment_count: 0,
      collect_count: 0,
      status,
      is_top: false,
      is_recommend: false,
      is_deleted: false,
      create_date: Date.now(),
      update_date: Date.now()
    }
    
    if (status === 1) {
      contentData.publish_date = Date.now()
    }
    
    const result = await contentCollection.add(contentData)
    
    // 更新用户内容数
    await db.collection('user-profile')
      .where({ user_id: uid })
      .update({
        content_count: dbCmd.inc(1)
      })
    
    return {
      code: 0,
      message: status === 1 ? '发布成功' : '保存草稿成功',
      data: {
        _id: result.id
      }
    }
  } catch (error) {
    return {
      code: 500,
      message: '创建失败',
      error: error.message
    }
  }
}

// 获取内容列表
async function getContentList(data, uid) {
  const { 
    page = 1, 
    pageSize = 10, 
    category_id, 
    tag, 
    orderBy = 'create_date',
    order = 'desc',
    is_top,
    is_recommend
  } = data
  
  let where = {
    status: 1,
    is_deleted: false
  }
  
  // 分类筛选
  if (category_id) {
    where.category_id = category_id
  }
  
  // 标签筛选
  if (tag) {
    where.tags = tag
  }
  
  // 置顶筛选
  if (is_top !== undefined) {
    where.is_top = is_top
  }
  
  // 推荐筛选
  if (is_recommend !== undefined) {
    where.is_recommend = is_recommend
  }
  
  try {
    const contentRes = await contentCollection
      .where(where)
      .orderBy(orderBy, order)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()
    
    if (contentRes.data.length === 0) {
      return {
        code: 0,
        message: '没有更多内容',
        data: {
          list: [],
          hasMore: false
        }
      }
    }
    
    // 获取用户信息
    const userIds = contentRes.data.map(item => item.user_id)
    const userRes = await db.collection('user-profile')
      .where({
        user_id: dbCmd.in(userIds)
      })
      .field({
        user_id: true,
        nickname: true,
        avatar: true
      })
      .get()
    
    const userMap = {}
    userRes.data.forEach(user => {
      userMap[user.user_id] = user
    })
    
    // 获取当前用户的点赞收藏状态
    const contentIds = contentRes.data.map(item => item._id)
    const [likeRes, collectRes] = await Promise.all([
      db.collection('likes').where({
        content_id: dbCmd.in(contentIds),
        user_id: uid
      }).get(),
      db.collection('collects').where({
        content_id: dbCmd.in(contentIds),
        user_id: uid
      }).get()
    ])
    
    const likedContentIds = likeRes.data.map(item => item.content_id)
    const collectedContentIds = collectRes.data.map(item => item.content_id)
    
    // 组合数据
    const list = contentRes.data.map(content => ({
      ...content,
      user_info: userMap[content.user_id] || {},
      is_liked: likedContentIds.includes(content._id),
      is_collected: collectedContentIds.includes(content._id),
      time_ago: formatTimeAgo(content.create_date)
    }))
    
    return {
      code: 0,
      message: '获取成功',
      data: {
        list,
        hasMore: list.length === pageSize
      }
    }
  } catch (error) {
    return {
      code: 500,
      message: '获取失败',
      error: error.message
    }
  }
}

// 点赞内容
async function likeContent(data, uid) {
  const { content_id } = data
  
  try {
    // 检查内容是否存在
    const contentRes = await contentCollection.doc(content_id).get()
    if (!contentRes.data[0]) {
      return {
        code: 404,
        message: '内容不存在'
      }
    }
    
    // 检查是否已点赞
    const likeRes = await db.collection('likes')
      .where({
        content_id,
        user_id: uid
      })
      .get()
    
    if (likeRes.data.length > 0) {
      // 取消点赞
      await db.collection('likes').doc(likeRes.data[0]._id).remove()
      
      await contentCollection.doc(content_id).update({
        like_count: dbCmd.inc(-1)
      })
      
      // 更新用户获赞数
      await db.collection('user-profile')
        .where({ user_id: contentRes.data[0].user_id })
        .update({
          likes_count: dbCmd.inc(-1)
        })
      
      return {
        code: 0,
        message: '取消点赞成功',
        data: { is_liked: false }
      }
    } else {
      // 添加点赞
      await db.collection('likes').add({
        content_id,
        user_id: uid,
        create_date: Date.now()
      })
      
      await contentCollection.doc(content_id).update({
        like_count: dbCmd.inc(1)
      })
      
      // 更新用户获赞数
      await db.collection('user-profile')
        .where({ user_id: contentRes.data[0].user_id })
        .update({
          likes_count: dbCmd.inc(1)
        })
      
      return {
        code: 0,
        message: '点赞成功',
        data: { is_liked: true }
      }
    }
  } catch (error) {
    return {
      code: 500,
      message: '操作失败',
      error: error.message
    }
  }
}