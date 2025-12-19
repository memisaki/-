// index.js - 内容管理系统主云函数（完整版）
'use strict';
const uniID = require('uni-id-common')
const db = uniCloud.database()
const dbCmd = db.command
const contentCollection = db.collection('contents')
const likesCollection = db.collection('likes')
const collectsCollection = db.collection('collects')
const userProfileCollection = db.collection('user-profile')

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
    // 内容管理基础功能
    case 'createContent':      // 创建内容
      return await createContent(data, uid)
    case 'updateContent':      // 更新内容
      return await updateContent(data, uid)
    case 'deleteContent':      // 删除内容（软删除）
      return await deleteContent(data, uid)
    case 'getContentList':     // 获取内容列表（带分页）
      return await getContentList(data, uid)
    case 'getContentDetail':   // 获取内容详情
      return await getContentDetail(data, uid)
    case 'getUserContents':    // 获取指定用户的内容
      return await getUserContents(data, uid)
    case 'searchContents':     // 搜索内容
      return await searchContents(data, uid)
    case 'getCategories':      // 获取分类列表
      return await getCategories(data, uid)
    case 'getTags':           // 获取标签列表
      return await getTags(data, uid)
    case 'getHotContents':    // 获取热门内容
      return await getHotContents(data, uid)
    case 'getRecommendContents': // 获取推荐内容
      return await getRecommendContents(data, uid)
      
    // 点赞功能
    case 'likeContent':        // 点赞/取消点赞内容
      return await likeContent(data, uid)
    case 'getContentLikes':    // 获取内容的点赞列表
      return await getContentLikes(data, uid)
    case 'getUserLikes':       // 获取用户点赞的内容
      return await getUserLikes(data, uid)
      
    // 收藏功能
    case 'collectContent':     // 收藏/取消收藏内容
      return await collectContent(data, uid)
    case 'getContentCollects': // 获取内容的收藏列表
      return await getContentCollects(data, uid)
    case 'getUserCollects':    // 获取用户收藏的内容
      return await getUserCollects(data, uid)
    case 'createCollectFolder': // 创建收藏夹
      return await createCollectFolder(data, uid)
    case 'updateCollectNote':  // 更新收藏备注
      return await updateCollectNote(data, uid)
      
    // 浏览统计
    case 'updateViewCount':    // 更新浏览量
      return await updateViewCount(data, uid)
    case 'getViewHistory':     // 获取浏览历史
      return await getViewHistory(data, uid)
      
    // 管理员功能
    case 'adminUpdateContent': // 管理员更新内容
      return await adminUpdateContent(data, userInfo)
    case 'adminDeleteContent': // 管理员删除内容
      return await adminDeleteContent(data, userInfo)
    case 'adminSetTop':        // 管理员设置置顶
      return await adminSetTop(data, userInfo)
    case 'adminSetRecommend':  // 管理员设置推荐
      return await adminSetRecommend(data, userInfo)
      
    default:
      return {
        code: 400,
        message: '无效的操作'
      }
  }
}

// ==================== 内容管理基础功能 ====================

// 创建内容
async function createContent(data, uid) {
  const { 
    title, 
    content, 
    cover_image, 
    images = [], 
    category_id, 
    tags = [], 
    summary,
    status = 1,
    privacy = 0
  } = data
  
  if (!title || !content) {
    return {
      code: 400,
      message: '标题和内容不能为空'
    }
  }
  
  if (title.length > 100) {
    return {
      code: 400,
      message: '标题长度不能超过100个字符'
    }
  }
  
  if (content.length > 5000) {
    return {
      code: 400,
      message: '内容长度不能超过5000个字符'
    }
  }
  
  try {
    const contentData = {
      title: title.trim(),
      content: content.trim(),
      summary: summary || content.substring(0, 200).trim(),
      cover_image,
      images,
      category_id,
      tags: tags.map(tag => tag.trim()).filter(tag => tag),
      user_id: uid,
      view_count: 0,
      like_count: 0,
      comment_count: 0,
      collect_count: 0,
      status, // 0:草稿 1:已发布 2:审核中 3:审核失败
      privacy, // 0:公开 1:私密 2:仅粉丝可见
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
    if (status === 1) {
      await userProfileCollection
        .where({ user_id: uid })
        .update({
          content_count: dbCmd.inc(1)
        })
    }
    
    return {
      code: 0,
      message: status === 1 ? '发布成功' : '保存草稿成功',
      data: {
        _id: result.id
      }
    }
  } catch (error) {
    console.error('创建内容失败:', error)
    return {
      code: 500,
      message: '创建失败',
      error: error.message
    }
  }
}

// 更新内容
async function updateContent(data, uid) {
  const { 
    content_id,
    title, 
    content, 
    cover_image, 
    images, 
    category_id, 
    tags, 
    summary,
    status,
    privacy
  } = data
  
  if (!content_id) {
    return {
      code: 400,
      message: '内容ID不能为空'
    }
  }
  
  try {
    // 检查内容是否存在且属于当前用户
    const contentRes = await contentCollection.doc(content_id).get()
    if (!contentRes.data[0]) {
      return {
        code: 404,
        message: '内容不存在'
      }
    }
    
    const contentData = contentRes.data[0]
    if (contentData.user_id !== uid) {
      return {
        code: 403,
        message: '无权修改此内容'
      }
    }
    
    // 构建更新数据
    const updateData = {
      update_date: Date.now()
    }
    
    if (title !== undefined) updateData.title = title.trim()
    if (content !== undefined) updateData.content = content.trim()
    if (cover_image !== undefined) updateData.cover_image = cover_image
    if (images !== undefined) updateData.images = images
    if (category_id !== undefined) updateData.category_id = category_id
    if (tags !== undefined) updateData.tags = tags.map(tag => tag.trim()).filter(tag => tag)
    if (summary !== undefined) updateData.summary = summary.trim()
    if (status !== undefined) updateData.status = status
    if (privacy !== undefined) updateData.privacy = privacy
    
    // 如果状态从草稿变为发布，设置发布时间
    if (contentData.status !== 1 && status === 1) {
      updateData.publish_date = Date.now()
      // 更新用户内容数
      await userProfileCollection
        .where({ user_id: uid })
        .update({
          content_count: dbCmd.inc(1)
        })
    }
    // 如果状态从发布变为草稿，减少用户内容数
    else if (contentData.status === 1 && status !== 1) {
      await userProfileCollection
        .where({ user_id: uid })
        .update({
          content_count: dbCmd.inc(-1)
        })
    }
    
    await contentCollection.doc(content_id).update(updateData)
    
    return {
      code: 0,
      message: '更新成功'
    }
  } catch (error) {
    console.error('更新内容失败:', error)
    return {
      code: 500,
      message: '更新失败',
      error: error.message
    }
  }
}

// 删除内容（软删除）
async function deleteContent(data, uid) {
  const { content_id } = data
  
  if (!content_id) {
    return {
      code: 400,
      message: '内容ID不能为空'
    }
  }
  
  try {
    const contentRes = await contentCollection.doc(content_id).get()
    if (!contentRes.data[0]) {
      return {
        code: 404,
        message: '内容不存在'
      }
    }
    
    const contentData = contentRes.data[0]
    if (contentData.user_id !== uid) {
      return {
        code: 403,
        message: '无权删除此内容'
      }
    }
    
    // 软删除
    await contentCollection.doc(content_id).update({
      is_deleted: true,
      update_date: Date.now()
    })
    
    // 如果内容是已发布的，减少用户内容数
    if (contentData.status === 1) {
      await userProfileCollection
        .where({ user_id: uid })
        .update({
          content_count: dbCmd.inc(-1)
        })
    }
    
    return {
      code: 0,
      message: '删除成功'
    }
  } catch (error) {
    console.error('删除内容失败:', error)
    return {
      code: 500,
      message: '删除失败',
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
    is_recommend,
    privacy = 0,
    user_id,
    keyword
  } = data
  
  let where = {
    status: 1,
    is_deleted: false
  }
  
  // 权限过滤：只能看到公开或自己可见的内容
  where.$or = [
    { privacy: 0 }, // 公开
    { privacy: 1, user_id: uid }, // 私密，只能自己看
    { privacy: 2, user_id: uid } // 仅粉丝可见，简化处理为只能自己看
  ]
  
  // 分类筛选
  if (category_id) {
    where.category_id = category_id
  }
  
  // 标签筛选
  if (tag) {
    where.tags = tag
  }
  
  // 用户筛选
  if (user_id) {
    where.user_id = user_id
    // 如果是查看自己的内容，可以看到私密内容
    if (user_id === uid) {
      where.$or = [
        { user_id: uid }
      ]
    }
  }
  
  // 置顶筛选
  if (is_top !== undefined) {
    where.is_top = is_top
  }
  
  // 推荐筛选
  if (is_recommend !== undefined) {
    where.is_recommend = is_recommend
  }
  
  // 关键词搜索
  if (keyword && keyword.trim()) {
    where.$or = [
      { title: new RegExp(keyword, 'i') },
      { content: new RegExp(keyword, 'i') },
      { tags: keyword }
    ]
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
    const userRes = await userProfileCollection
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
      likesCollection.where({
        content_id: dbCmd.in(contentIds),
        user_id: uid,
        type: 1
      }).get(),
      collectsCollection.where({
        content_id: dbCmd.in(contentIds),
        user_id: uid
      }).get()
    ])
    
    const likedContentIds = likeRes.data.map(item => item.content_id)
    const collectedContentIds = collectRes.data.map(item => item.content_id)
    
    // 组合数据
    const list = contentRes.data.map(content => ({
      ...content,
      user_info: userMap[content.user_id] || {
        user_id: content.user_id,
        nickname: '用户',
        avatar: '/static/default-avatar.png'
      },
      is_liked: likedContentIds.includes(content._id),
      is_collected: collectedContentIds.includes(content._id),
      time_ago: formatTimeAgo(content.create_date),
      // 处理图片数组
      images: content.images || [],
      cover_image: content.cover_image || (content.images && content.images[0]) || ''
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
    console.error('获取内容列表失败:', error)
    return {
      code: 500,
      message: '获取失败',
      error: error.message
    }
  }
}

// 获取内容详情
async function getContentDetail(data, uid) {
  const { content_id } = data
  
  if (!content_id) {
    return {
      code: 400,
      message: '内容ID不能为空'
    }
  }
  
  try {
    // 获取内容详情
    const contentRes = await contentCollection.doc(content_id).get()
    if (!contentRes.data[0]) {
      return {
        code: 404,
        message: '内容不存在'
      }
    }
    
    const content = contentRes.data[0]
    
    // 检查权限
    if (content.privacy !== 0 && content.user_id !== uid) {
      return {
        code: 403,
        message: '无权查看此内容'
      }
    }
    
    // 增加浏览数
    await contentCollection.doc(content_id).update({
      view_count: dbCmd.inc(1),
      update_date: Date.now()
    })
    content.view_count += 1
    
    // 获取用户信息
    const [userRes, likeRes, collectRes] = await Promise.all([
      userProfileCollection
        .where({ user_id: content.user_id })
        .field({
          user_id: true,
          nickname: true,
          avatar: true,
          signature: true
        })
        .get(),
      likesCollection.where({
        content_id,
        user_id: uid,
        type: 1
      }).get(),
      collectsCollection.where({
        content_id,
        user_id: uid
      }).get()
    ])
    
    // 获取点赞用户列表（前10个）
    const likeUsersRes = await likesCollection
      .where({ content_id, type: 1 })
      .orderBy('create_date', 'desc')
      .limit(10)
      .get()
    
    const likeUserIds = likeUsersRes.data.map(item => item.user_id)
    const likeUsersProfileRes = await userProfileCollection
      .where({ user_id: dbCmd.in(likeUserIds) })
      .field({
        user_id: true,
        nickname: true,
        avatar: true
      })
      .get()
    
    const likeUsersMap = {}
    likeUsersProfileRes.data.forEach(user => {
      likeUsersMap[user.user_id] = user
    })
    
    const likes = likeUsersRes.data.map(like => ({
      ...like,
      user_info: likeUsersMap[like.user_id] || {}
    }))
    
    return {
      code: 0,
      message: '获取成功',
      data: {
        ...content,
        user_info: userRes.data[0] || {
          user_id: content.user_id,
          nickname: '用户',
          avatar: '/static/default-avatar.png'
        },
        is_liked: likeRes.data.length > 0,
        is_collected: collectRes.data.length > 0,
        time_ago: formatTimeAgo(content.create_date),
        // 点赞用户预览
        likes_preview: likes,
        // 相关标签内容（可选）
        related_contents: []
      }
    }
  } catch (error) {
    console.error('获取内容详情失败:', error)
    return {
      code: 500,
      message: '获取失败',
      error: error.message
    }
  }
}

// ==================== 点赞功能 ====================

// 点赞/取消点赞内容
async function likeContent(data, uid) {
  const { content_id } = data
  
  if (!content_id) {
    return {
      code: 400,
      message: '内容ID不能为空'
    }
  }
  
  try {
    // 检查内容是否存在
    const contentRes = await contentCollection.doc(content_id).get()
    if (!contentRes.data[0]) {
      return {
        code: 404,
        message: '内容不存在'
      }
    }
    
    const content = contentRes.data[0]
    
    // 检查是否已点赞
    const likeRes = await likesCollection
      .where({
        content_id,
        user_id: uid,
        type: 1
      })
      .get()
    
    if (likeRes.data.length > 0) {
      // 取消点赞
      await likesCollection.doc(likeRes.data[0]._id).remove()
      
      // 更新内容点赞数
      await contentCollection.doc(content_id).update({
        like_count: dbCmd.inc(-1),
        update_date: Date.now()
      })
      
      // 更新用户获赞数
      await userProfileCollection
        .where({ user_id: content.user_id })
        .update({
          likes_count: dbCmd.inc(-1)
        })
      
      return {
        code: 0,
        message: '取消点赞成功',
        data: { 
          is_liked: false,
          like_count: content.like_count - 1
        }
      }
    } else {
      // 添加点赞
      await likesCollection.add({
        content_id,
        user_id: uid,
        type: 1,
        create_date: Date.now()
      })
      
      // 更新内容点赞数
      await contentCollection.doc(content_id).update({
        like_count: dbCmd.inc(1),
        update_date: Date.now()
      })
      
      // 更新用户获赞数
      await userProfileCollection
        .where({ user_id: content.user_id })
        .update({
          likes_count: dbCmd.inc(1)
        })
      
      return {
        code: 0,
        message: '点赞成功',
        data: { 
          is_liked: true,
          like_count: content.like_count + 1
        }
      }
    }
  } catch (error) {
    console.error('点赞操作失败:', error)
    return {
      code: 500,
      message: '操作失败',
      error: error.message
    }
  }
}

// 获取内容的点赞列表
async function getContentLikes(data, uid) {
  const { content_id, page = 1, pageSize = 20 } = data
  
  if (!content_id) {
    return {
      code: 400,
      message: '内容ID不能为空'
    }
  }
  
  try {
    const likesRes = await likesCollection
      .where({ content_id, type: 1 })
      .orderBy('create_date', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()
    
    if (likesRes.data.length === 0) {
      return {
        code: 0,
        message: '暂无点赞',
        data: {
          list: [],
          hasMore: false
        }
      }
    }
    
    // 获取用户信息
    const userIds = likesRes.data.map(item => item.user_id)
    const userRes = await userProfileCollection
      .where({ user_id: dbCmd.in(userIds) })
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
    
    // 组合数据
    const list = likesRes.data.map(like => ({
      ...like,
      user_info: userMap[like.user_id] || {},
      time_ago: formatTimeAgo(like.create_date)
    }))
    
    // 获取总点赞数
    const totalRes = await likesCollection
      .where({ content_id, type: 1 })
      .count()
    
    return {
      code: 0,
      message: '获取成功',
      data: {
        list,
        total: totalRes.total,
        hasMore: list.length === pageSize
      }
    }
  } catch (error) {
    console.error('获取点赞列表失败:', error)
    return {
      code: 500,
      message: '获取失败',
      error: error.message
    }
  }
}

// 获取用户点赞的内容
async function getUserLikes(data, uid) {
  const { user_id, page = 1, pageSize = 10 } = data
  
  const targetUserId = user_id || uid
  
  try {
    // 获取用户点赞记录
    const likesRes = await likesCollection
      .where({ user_id: targetUserId, type: 1 })
      .orderBy('create_date', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()
    
    if (likesRes.data.length === 0) {
      return {
        code: 0,
        message: '暂无点赞内容',
        data: {
          list: [],
          hasMore: false
        }
      }
    }
    
    // 获取内容信息
    const contentIds = likesRes.data.map(item => item.content_id)
    const contentRes = await contentCollection
      .where({
        _id: dbCmd.in(contentIds),
        status: 1,
        is_deleted: false
      })
      .get()
    
    const contentMap = {}
    contentRes.data.forEach(content => {
      contentMap[content._id] = content
    })
    
    // 获取内容作者信息
    const userIds = contentRes.data.map(item => item.user_id)
    const userRes = await userProfileCollection
      .where({ user_id: dbCmd.in(userIds) })
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
    
    // 组合数据
    const list = likesRes.data
      .filter(like => contentMap[like.content_id]) // 过滤已删除的内容
      .map(like => {
        const content = contentMap[like.content_id]
        return {
          ...like,
          content_info: {
            ...content,
            user_info: userMap[content.user_id] || {},
            time_ago: formatTimeAgo(content.create_date)
          },
          time_ago: formatTimeAgo(like.create_date)
        }
      })
    
    return {
      code: 0,
      message: '获取成功',
      data: {
        list,
        hasMore: list.length === pageSize
      }
    }
  } catch (error) {
    console.error('获取用户点赞内容失败:', error)
    return {
      code: 500,
      message: '获取失败',
      error: error.message
    }
  }
}

// ==================== 收藏功能 ====================

// 收藏/取消收藏内容
async function collectContent(data, uid) {
  const { content_id, folder_id, note } = data
  
  if (!content_id) {
    return {
      code: 400,
      message: '内容ID不能为空'
    }
  }
  
  try {
    // 检查内容是否存在
    const contentRes = await contentCollection.doc(content_id).get()
    if (!contentRes.data[0]) {
      return {
        code: 404,
        message: '内容不存在'
      }
    }
    
    const content = contentRes.data[0]
    
    // 检查是否已收藏
    const collectRes = await collectsCollection
      .where({
        content_id,
        user_id: uid
      })
      .get()
    
    if (collectRes.data.length > 0) {
      // 取消收藏
      await collectsCollection.doc(collectRes.data[0]._id).remove()
      
      // 更新内容收藏数
      await contentCollection.doc(content_id).update({
        collect_count: dbCmd.inc(-1),
        update_date: Date.now()
      })
      
      return {
        code: 0,
        message: '取消收藏成功',
        data: { 
          is_collected: false,
          collect_count: content.collect_count - 1
        }
      }
    } else {
      // 添加收藏
      await collectsCollection.add({
        content_id,
        user_id: uid,
        folder_id: folder_id || null,
        note: note || '',
        create_date: Date.now(),
        update_date: Date.now()
      })
      
      // 更新内容收藏数
      await contentCollection.doc(content_id).update({
        collect_count: dbCmd.inc(1),
        update_date: Date.now()
      })
      
      return {
        code: 0,
        message: '收藏成功',
        data: { 
          is_collected: true,
          collect_count: content.collect_count + 1
        }
      }
    }
  } catch (error) {
    console.error('收藏操作失败:', error)
    return {
      code: 500,
      message: '操作失败',
      error: error.message
    }
  }
}

// 获取用户收藏的内容
async function getUserCollects(data, uid) {
  const { user_id, folder_id, page = 1, pageSize = 10 } = data
  
  const targetUserId = user_id || uid
  
  try {
    let where = { user_id: targetUserId }
    if (folder_id) {
      where.folder_id = folder_id
    }
    
    // 获取用户收藏记录
    const collectsRes = await collectsCollection
      .where(where)
      .orderBy('create_date', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()
    
    if (collectsRes.data.length === 0) {
      return {
        code: 0,
        message: '暂无收藏内容',
        data: {
          list: [],
          hasMore: false
        }
      }
    }
    
    // 获取内容信息
    const contentIds = collectsRes.data.map(item => item.content_id)
    const contentRes = await contentCollection
      .where({
        _id: dbCmd.in(contentIds),
        status: 1,
        is_deleted: false
      })
      .get()
    
    const contentMap = {}
    contentRes.data.forEach(content => {
      contentMap[content._id] = content
    })
    
    // 获取内容作者信息
    const userIds = contentRes.data.map(item => item.user_id)
    const userRes = await userProfileCollection
      .where({ user_id: dbCmd.in(userIds) })
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
    
    // 组合数据
    const list = collectsRes.data
      .filter(collect => contentMap[collect.content_id]) // 过滤已删除的内容
      .map(collect => {
        const content = contentMap[collect.content_id]
        return {
          ...collect,
          content_info: {
            ...content,
            user_info: userMap[content.user_id] || {},
            time_ago: formatTimeAgo(content.create_date)
          },
          time_ago: formatTimeAgo(collect.create_date)
        }
      })
    
    return {
      code: 0,
      message: '获取成功',
      data: {
        list,
        hasMore: list.length === pageSize
      }
    }
  } catch (error) {
    console.error('获取用户收藏内容失败:', error)
    return {
      code: 500,
      message: '获取失败',
      error: error.message
    }
  }
}

// ==================== 其他功能 ====================

// 获取指定用户的内容
async function getUserContents(data, currentUid) {
  const { user_id, page = 1, pageSize = 10 } = data
  
  if (!user_id) {
    return {
      code: 400,
      message: '用户ID不能为空'
    }
  }
  
  try {
    let where = {
      user_id,
      status: 1,
      is_deleted: false
    }
    
    // 如果是查看自己的内容，可以看到所有状态的内容
    if (user_id === currentUid) {
      where = {
        user_id,
        is_deleted: false
      }
    }
    
    const contentRes = await contentCollection
      .where(where)
      .orderBy('create_date', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()
    
    if (contentRes.data.length === 0) {
      return {
        code: 0,
        message: '暂无内容',
        data: {
          list: [],
          hasMore: false
        }
      }
    }
    
    // 获取用户信息
    const userRes = await userProfileCollection
      .where({ user_id })
      .field({
        user_id: true,
        nickname: true,
        avatar: true
      })
      .get()
    
    // 获取当前用户的点赞收藏状态
    const contentIds = contentRes.data.map(item => item._id)
    const [likeRes, collectRes] = await Promise.all([
      likesCollection.where({
        content_id: dbCmd.in(contentIds),
        user_id: currentUid,
        type: 1
      }).get(),
      collectsCollection.where({
        content_id: dbCmd.in(contentIds),
        user_id: currentUid
      }).get()
    ])
    
    const likedContentIds = likeRes.data.map(item => item.content_id)
    const collectedContentIds = collectRes.data.map(item => item.content_id)
    
    // 组合数据
    const contents = contentRes.data.map(content => ({
      ...content,
      user_info: userRes.data[0] || {
        user_id: user_id,
        nickname: '用户',
        avatar: '/static/default-avatar.png'
      },
      is_liked: likedContentIds.includes(content._id),
      is_collected: collectedContentIds.includes(content._id),
      time_ago: formatTimeAgo(content.create_date)
    }))
    
    return {
      code: 0,
      message: '获取成功',
      data: {
        list: contents,
        hasMore: contents.length === pageSize
      }
    }
  } catch (error) {
    console.error('获取用户内容失败:', error)
    return {
      code: 500,
      message: '获取失败',
      error: error.message
    }
  }
}

// 搜索内容
async function searchContents(data, uid) {
  const { keyword, category_id, tag, page = 1, pageSize = 10 } = data
  
  if (!keyword || keyword.trim() === '') {
    return {
      code: 400,
      message: '搜索关键词不能为空'
    }
  }
  
  try {
    let where = {
      status: 1,
      is_deleted: false,
      $or: [
        { title: new RegExp(keyword, 'i') },
        { content: new RegExp(keyword, 'i') },
        { tags: keyword }
      ]
    }
    
    // 权限过滤
    where.$and = [
      {
        $or: [
          { privacy: 0 },
          { privacy: 1, user_id: uid },
          { privacy: 2, user_id: uid }
        ]
      }
    ]
    
    if (category_id) {
      where.category_id = category_id
    }
    
    if (tag) {
      where.tags = tag
    }
    
    const contentRes = await contentCollection
      .where(where)
      .orderBy('create_date', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()
    
    if (contentRes.data.length === 0) {
      return {
        code: 0,
        message: '未找到相关内容',
        data: {
          list: [],
          hasMore: false
        }
      }
    }
    
    // 获取用户信息
    const userIds = contentRes.data.map(item => item.user_id)
    const userRes = await userProfileCollection
      .where({ user_id: dbCmd.in(userIds) })
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
      likesCollection.where({
        content_id: dbCmd.in(contentIds),
        user_id: uid,
        type: 1
      }).get(),
      collectsCollection.where({
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
      message: '搜索成功',
      data: {
        list,
        hasMore: list.length === pageSize
      }
    }
  } catch (error) {
    console.error('搜索内容失败:', error)
    return {
      code: 500,
      message: '搜索失败',
      error: error.message
    }
  }
}

// ==================== 辅助函数 ====================

// 时间格式化函数
function formatTimeAgo(timestamp) {
  if (!timestamp) return ''
  
  const now = Date.now()
  const diff = now - timestamp
  
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour
  const month = 30 * day
  const year = 365 * day
  
  if (diff < minute) {
    return '刚刚'
  } else if (diff < hour) {
    return Math.floor(diff / minute) + '分钟前'
  } else if (diff < day) {
    return Math.floor(diff / hour) + '小时前'
  } else if (diff < month) {
    return Math.floor(diff / day) + '天前'
  } else if (diff < year) {
    return Math.floor(diff / month) + '个月前'
  } else {
    return Math.floor(diff / year) + '年前'
  }
}

// 占位函数（后续实现）
async function getCategories(data, uid) {
  return { code: 0, message: '暂未实现', data: [] }
}

async function getTags(data, uid) {
  return { code: 0, message: '暂未实现', data: [] }
}

async function getHotContents(data, uid) {
  return { code: 0, message: '暂未实现', data: [] }
}

async function getRecommendContents(data, uid) {
  return { code: 0, message: '暂未实现', data: [] }
}

async function getContentCollects(data, uid) {
  return { code: 0, message: '暂未实现', data: [] }
}

async function createCollectFolder(data, uid) {
  return { code: 0, message: '暂未实现', data: {} }
}

async function updateCollectNote(data, uid) {
  return { code: 0, message: '暂未实现', data: {} }
}

async function updateViewCount(data, uid) {
  return { code: 0, message: '暂未实现', data: {} }
}

async function getViewHistory(data, uid) {
  return { code: 0, message: '暂未实现', data: [] }
}

async function adminUpdateContent(data, userInfo) {
  return { code: 0, message: '暂未实现', data: {} }
}

async function adminDeleteContent(data, userInfo) {
  return { code: 0, message: '暂未实现', data: {} }
}

async function adminSetTop(data, userInfo) {
  return { code: 0, message: '暂未实现', data: {} }
}

async function adminSetRecommend(data, userInfo) {
  return { code: 0, message: '暂未实现', data: {} }
}