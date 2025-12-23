const db = uniCloud.database()

exports.main = async (event, context) => {
    const { content_id, title, content, tags } = event

    const res = await db.collection('contents').doc(content_id).update({
        title,
        content,
        tags,
        updated_at: new Date()
    })

    if (res.updated === 1) {
        return { code: 200, message: '内容更新成功' }
    }
    return { code: 500, message: '内容更新失败' }
}
