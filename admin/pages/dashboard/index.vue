<template>
	<view class="layout">
		<view class="sidebar">
			<view class="brand">软工大作业 · 管理后台</view>
			<view class="nav">
				<view class="nav-item active" @click="go('/pages/dashboard/index')">数据概览</view>
				<view class="nav-item" @click="go('/pages/content/index')">内容管理</view>
				<view class="nav-item" @click="go('/pages/user/index')">用户管理</view>
			</view>
		</view>

		<view class="content">
			<view class="page-header">
				<view class="page-title">数据概览</view>
				<view class="row" style="gap: 8px;">
					<view class="btn secondary" @click="refresh">刷新</view>
				</view>
			</view>

			<view class="row">
				<view class="card stat">
					<view class="stat-label">内容总数</view>
					<view class="stat-value">{{ stats.contents }}</view>
				</view>
				<view class="card stat">
					<view class="stat-label">用户总数</view>
					<view class="stat-value">{{ stats.users }}</view>
				</view>
				<view class="card stat">
					<view class="stat-label">评论总数</view>
					<view class="stat-value">{{ stats.comments }}</view>
				</view>
				<view class="card stat">
					<view class="stat-label">今日新增内容</view>
					<view class="stat-value">{{ stats.todayContents }}</view>
				</view>
			</view>

			<view class="row" style="margin-top: 12px;">
				<view class="card" style="flex: 1; min-width: 420px;">
					<view style="display:flex; align-items:center; justify-content:space-between;">
						<view style="font-weight:600; color:#1f2329;">最新内容</view>
						<view class="link" @click="go('/pages/content/index')">查看全部</view>
					</view>
					<view class="table" style="margin-top: 10px;">
						<view class="thead" style="grid-template-columns: 2fr 1fr 1fr 1fr;">
							<view class="cell">标题</view>
							<view class="cell">状态</view>
							<view class="cell">标签</view>
							<view class="cell">创建时间</view>
						</view>
						<view v-for="item in recentContents" :key="item._id" class="trow" style="grid-template-columns: 2fr 1fr 1fr 1fr;">
							<view class="cell">{{ item.title || item._id }}</view>
							<view class="cell"><view class="muted">{{ item.status || '-' }}</view></view>
							<view class="cell"><view class="muted">{{ item.tagsText || '-' }}</view></view>
							<view class="cell"><view class="muted">{{ item.createdAtText || '-' }}</view></view>
						</view>
						<view v-if="recentContents.length === 0" class="trow" style="grid-template-columns: 1fr;">
							<view class="cell muted">暂无数据</view>
						</view>
					</view>
				</view>

				<view class="card" style="flex: 1; min-width: 420px;">
					<view style="display:flex; align-items:center; justify-content:space-between;">
						<view style="font-weight:600; color:#1f2329;">最新用户</view>
						<view class="link" @click="go('/pages/user/index')">查看全部</view>
					</view>
					<view class="table" style="margin-top: 10px;">
						<view class="thead" style="grid-template-columns: 2fr 1.2fr 1fr 1fr;">
							<view class="cell">昵称/账号</view>
							<view class="cell">手机号/邮箱</view>
							<view class="cell">状态</view>
							<view class="cell">注册时间</view>
						</view>
						<view v-for="item in recentUsers" :key="item._id" class="trow" style="grid-template-columns: 2fr 1.2fr 1fr 1fr;">
							<view class="cell">{{ item.displayName || item._id }}</view>
							<view class="cell"><view class="muted">{{ item.contact || '-' }}</view></view>
							<view class="cell"><view class="muted">{{ item.status || '-' }}</view></view>
							<view class="cell"><view class="muted">{{ item.createdAtText || '-' }}</view></view>
						</view>
						<view v-if="recentUsers.length === 0" class="trow" style="grid-template-columns: 1fr;">
							<view class="cell muted">暂无数据</view>
						</view>
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { onMounted, ref } from 'vue'

const stats = ref({
	contents: '--',
	users: '--',
	comments: '--',
	todayContents: '--',
})

const recentContents = ref([])
const recentUsers = ref([])

function go(url) {
	if (getCurrentPages().length > 0) {
		uni.redirectTo({ url })
		return
	}
	uni.navigateTo({ url })
}

function formatDateTime(value) {
	if (!value) return ''
	const d = typeof value === 'number' ? new Date(value) : new Date(String(value))
	if (Number.isNaN(d.getTime())) return String(value)
	const yyyy = d.getFullYear()
	const mm = String(d.getMonth() + 1).padStart(2, '0')
	const dd = String(d.getDate()).padStart(2, '0')
	const hh = String(d.getHours()).padStart(2, '0')
	const mi = String(d.getMinutes()).padStart(2, '0')
	return `${yyyy}-${mm}-${dd} ${hh}:${mi}`
}

function normalizeContent(doc) {
	const createdAt = doc.create_time ?? doc.created_at ?? doc.createdAt ?? doc.publish_time ?? doc.time
	const tags = doc.tags ?? doc.tag ?? doc.labels
	const tagsText = Array.isArray(tags) ? tags.join(',') : typeof tags === 'string' ? tags : ''
	return {
		...doc,
		tagsText,
		createdAtText: createdAt ? formatDateTime(createdAt) : '',
	}
}

function normalizeUser(doc) {
	const createdAt = doc.register_date ?? doc.create_time ?? doc.created_at ?? doc.createdAt
	const displayName = doc.nickname ?? doc.username ?? doc.userName ?? doc.mobile ?? doc.email ?? ''
	const contact = doc.mobile ?? doc.phone ?? doc.email ?? ''
	return {
		...doc,
		displayName,
		contact,
		createdAtText: createdAt ? formatDateTime(createdAt) : '',
	}
}

async function refresh() {
	await Promise.all([loadStats(), loadRecent()])
}

async function loadStats() {
	try {
		if (!globalThis.uniCloud?.database) {
			stats.value = { contents: '--', users: '--', comments: '--', todayContents: '--' }
			return
		}
		const db = uniCloud.database()
		const start = new Date()
		start.setHours(0, 0, 0, 0)
		const cmd = db.command

		const [contents, users, comments, todayContents] = await Promise.all([
			db.collection('contents').count(),
			db.collection('uni-id-users').count(),
			db.collection('comments').count(),
			db.collection('contents').where({ create_time: cmd.gte(start.getTime()) }).count(),
		])

		stats.value = {
			contents: String(contents.result?.total ?? '--'),
			users: String(users.result?.total ?? '--'),
			comments: String(comments.result?.total ?? '--'),
			todayContents: String(todayContents.result?.total ?? '--'),
		}
	} catch (e) {
		uni.showToast({ title: '加载统计失败', icon: 'none' })
	}
}

async function loadRecent() {
	try {
		if (!globalThis.uniCloud?.database) {
			recentContents.value = []
			recentUsers.value = []
			return
		}
		const db = uniCloud.database()
		const [contentsRes, usersRes] = await Promise.all([
			db.collection('contents').orderBy('create_time', 'desc').limit(5).get(),
			db.collection('uni-id-users').orderBy('register_date', 'desc').limit(5).get(),
		])
		recentContents.value = (contentsRes.result?.data ?? []).map(normalizeContent)
		recentUsers.value = (usersRes.result?.data ?? []).map(normalizeUser)
	} catch (e) {
		uni.showToast({ title: '加载列表失败', icon: 'none' })
		recentContents.value = []
		recentUsers.value = []
	}
}

onMounted(() => {
	refresh()
})
</script>

<style src="../_shared/styles.css"></style>

