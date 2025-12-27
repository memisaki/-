# Moments_Project 🎉

**基于 uni-app + uniCloud（阿里云）的朋友圈 / 内容分享小程序与管理后台**

---

## 简介 💡
这是一个用于课程作业/小型项目的“朋友圈”系统，包含两个主要子项目：

- **小程序端**（微信小程序前端，位于 `Moments_Project_code/小程序界面/`）：用户发布内容、上传图片/视频、评论、点赞等功能。
- **管理端（Web）**（位于 `Moments_Project_code/管理员界面/`）：后台内容与用户管理、数据仪表盘等（在浏览器中运行）。

后端基于 uniCloud（阿里云）云函数与数据库，包含常用的云函数模块（`content-api`、`comment-api`、`user-api`、`admin-api` 等）与数据库集合定义（`contents`、`comments`、`users` 等）。

---

## 主要功能 ✅
- 用户注册 / 登录（基于 uni-id）
- 发布多类型内容（文本 / 图片 / 视频 / 混合）
- 上传并获取 OSS 上传参数（`get-oss-upload-params` 云函数）
- 评论与回复、点赞、收藏
- 内容可见性（公开 / 私密 / 好友可见）
- 管理后台：内容管理、用户管理、数据概览
- 内容审核与 AI 分析字段（schema 中包含 AI 标签、NSFW 分数等）

---

## 仓库结构（摘要） 🔧
- `Moments_Project_code/管理员界面/`：管理后台代码、云函数与数据库 schema
- `Moments_Project_code/小程序界面/`：小程序端代码、云函数与数据库 schema

关键目录示例：
- `uniCloud-aliyun/cloudfunctions/`：云函数实现（`content-api`、`comment-api`、`user-api`、`admin-api`、`get-oss-upload-params` 等）
- `uniCloud-aliyun/database/`：数据库集合 schema（`contents.schema.json`、`comments.schema.json`、`users.schema.json` 等）
- `pages/`：前端页面（`index`、`content`、`user` 等）
- `static/`：静态资源（图片等）
- `uni_modules/`：uni-app 插件

---

## 环境与依赖 📦
- 开发工具：建议使用 **HBuilderX（DCloud）** 打开项目并运行（项目为 uni-app 框架）
- 云服务：**阿里云 uniCloud（UniCloud Space）**，首次运行前需要在 HBuilderX 中关联阿里云服务空间并启用云函数
- Node / npm：仅用于部分 uni_modules 或构建（仓库中部分 package.json 存放在子模块）

---

## 快速启动（开发者指南） ⚙️
1. 使用 HBuilderX 导入两个子项目：`管理员界面` 和 `小程序界面`（分别导入）
2. 在 HBuilderX 中关联你的阿里云 uniCloud 空间（首次运行必做）
3. 在运行配置中启用“使用云端云函数”
4. 运行方式：
   - 管理端：选择「运行到浏览器」或「运行到 H5」
   - 小程序端：选择「运行到微信小程序」，并在微信开发者工具中预览
5. 若出现显示或权限错误请刷新页面并检查云函数与数据库权限配置

---

## 云函数 API（示例） 🔌
以 `content-api` 为例，支持的 action（示例）：
- 公共接口：`get` / `get-content`（获取内容）、`get_user_info`（获取用户信息）
- 需要登录（私有）：`create` / `create-content`（创建内容）、`update` / `update-content`（更新内容）、`delete` / `delete-content`（删除内容）

示例调用：
```js
uniCloud.callFunction({
  name: 'content-api',
  data: { action: 'get-content', page: 1, page_size: 20 }
});
```

鉴权：云函数使用 uni-id / token 机制作为鉴权；部分云函数会检查 `context.UID` 或自定义 `uniIdToken`。

---

## 数据库（集合概览） 🗄️
重要集合（schema 位于 `uniCloud-aliyun/database`）：
- `contents`：内容表（包含 media_files、tags、visibility、stats、ai 分析字段等）
- `comments`：评论表（包含 comment_content、reply、ai_analysis、审核信息等）
- `users`：用户表（基于 uni-id 扩展，包含用户名、手机号、第三方 openid 等）
- 其他：`like`、`collects`、`user-follows` 等

---

## 常见问题 & 注意事项 ⚠️
- 初次运行需要关联阿里云空间与启用云函数，否则云功能不可用
- 管理端推荐在浏览器中运行；小程序端需要在微信开发者工具中预览
- 若出现接口或权限问题，请检查 uniCloud 数据库集合权限（schema 中定义了 read/create/update/delete 权限规则）

---

## 开发与贡献 ✨
欢迎提出 PR / Issue：
1. Fork 仓库并创建分支
2. 提交代码并发起 PR，描述你修改的功能或修复的问题
3. 可在 Issue 中先讨论较大改动的设计

---

