<template>
	<view class="layout">
		<view class="sidebar">
			<view class="brand">软工大作业 · 管理后台</view>
			<view class="nav">
				<view class="nav-item" @click="go('/pages/dashboard/index')">数据概览</view>
				<view class="nav-item" @click="go('/pages/content/index')">内容管理</view>
				<view class="nav-item active" @click="go('/pages/user/index')">用户管理</view>
			</view>
		</view>

		<view class="content">
			<view class="page-header">
				<view class="page-title">用户管理</view>
				<view class="row" style="gap: 8px;">
					<view class="btn secondary" @click="refresh">刷新</view>
				</view>
			</view>

			<view class="card">
				<view class="form">
					<view class="field">
						<view class="label">关键词</view>
						<input class="input" v-model="filters.keyword" placeholder="昵称/账号/手机号/邮箱" />
					</view>
					<view class="field">
						<view class="label">状态</view>
						<picker :range="statusOptions" range-key="label" @change="onStatusChange">
							<view class="select">{{ currentStatusLabel }}</view>
						</picker>
					</view>
					<view class="row" style="gap: 8px;">
						<view class="btn" @click="applyFilters">查询</view>
						<view class="btn secondary" @click="resetFilters">重置</view>
					</view>
				</view>
			</view>

			<view class="table">
				<view class="thead" style="grid-template-columns: 2fr 1.2fr 1fr 1fr 1fr 1.3fr;">
					<view class="cell">昵称/账号</view>
					<view class="cell">手机号/邮箱</view>
					<view class="cell">角色</view>
					<view class="cell">状态</view>
					<view class="cell">注册时间</view>
					<view class="cell">操作</view>
				</view>
				<view v-for="item in rows" :key="item._id" class="trow" style="grid-template-columns: 2fr 1.2fr 1fr 1fr 1fr 1.3fr;">
					<view class="cell">{{ item.displayName || item._id }}</view>
					<view class="cell"><view class="muted">{{ item.contact || '-' }}</view></view>
					<view class="cell"><view class="muted">{{ item.roleText || '-' }}</view></view>
					<view class="cell"><view class="muted">{{ item.status || '-' }}</view></view>
					<view class="cell"><view class="muted">{{ item.createdAtText || '-' }}</view></view>
					<view class="cell">
						<view class="actions">
							<view class="link" @click="viewDetail(item)">详情</view>
							<view class="link" @click="toggleStatus(item)">{{ item.status === 'disabled' ? '启用' : '禁用' }}</view>
						</view>
					</view>
				</view>
				<view v-if="rows.length === 0" class="trow" style="grid-template-columns: 1fr;">
					<view class="cell muted">暂无数据</view>
				</view>
			</view>

			<view class="pagination">
				<button class="page-btn" :disabled="page <= 1" @click="prevPage">上一页</button>
				<view class="muted">第 {{ page }} 页</view>
				<button class="page-btn" :disabled="rows.length < pageSize" @click="nextPage">下一页</button>
			</view>
		</view>
	</view>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'

const statusOptions = [
	{ label: '全部', value: '' },
	{ label: '正常', value: 'active' },
	{ label: '禁用', value: 'disabled' },
]

const filters = ref({
	keyword: '',
	status: '',
})

const page = ref(1)
const pageSize = ref(10)
const rows = ref([])

const currentStatusLabel = computed(() => statusOptions.find((x) => x.value === filters.value.status)?.label ?? '全部')

function go(url) {
	uni.redirectTo({ url })
}

function onStatusChange(e) {
	const idx = Number(e.detail.value)
	filters.value.status = statusOptions[idx]?.value ?? ''
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

function normalizeUser(doc) {
	const createdAt = doc.register_date ?? doc.create_time ?? doc.created_at ?? doc.createdAt
	const displayName = doc.nickname ?? doc.username ?? doc.userName ?? doc.mobile ?? doc.email ?? ''
	const contact = doc.mobile ?? doc.phone ?? doc.email ?? ''
	const role = doc.role ?? doc.roles ?? doc.roleList
	const roleText = Array.isArray(role) ? role.join(',') : typeof role === 'string' ? role : ''
	return {
		...doc,
		displayName,
		contact,
		roleText,
		createdAtText: createdAt ? formatDateTime(createdAt) : '',
	}
}

function buildWhere(db) {
	const where = {}
	if (filters.value.status) where.status = filters.value.status
	if (filters.value.keyword) {
		const reg = db.RegExp({ regexp: filters.value.keyword, options: 'i' })
		where.nickname = reg
	}
	return where
}

async function refresh() {
	await loadPage(1)
}

async function applyFilters() {
	await loadPage(1)
}

async function resetFilters() {
	filters.value = { keyword: '', status: '' }
	await loadPage(1)
}

async function loadPage(targetPage) {
	page.value = targetPage
	try {
		if (!globalThis.uniCloud?.database) {
			rows.value = []
			return
		}
		const db = uniCloud.database()
		const skip = (page.value - 1) * pageSize.value
		const where = buildWhere(db)
		const res = await db.collection('uni-id-users').where(where).orderBy('register_date', 'desc').skip(skip).limit(pageSize.value).get()
		rows.value = (res.result?.data ?? []).map(normalizeUser)
	} catch (e) {
		uni.showToast({ title: '加载失败', icon: 'none' })
		rows.value = []
	}
}

function viewDetail(item) {
	uni.navigateTo({ url: `/pages/user/detail?id=${encodeURIComponent(item._id)}` })
}

async function toggleStatus(item) {
	const next = item.status === 'disabled' ? 'active' : 'disabled'
	const res = await uni.showModal({
		title: next === 'disabled' ? '确认禁用' : '确认启用',
		content: next === 'disabled' ? '禁用后该用户将无法正常使用' : '启用后该用户可继续使用',
	})
	if (!res.confirm) return
	try {
		if (!globalThis.uniCloud?.database) return
		const db = uniCloud.database()
		await db.collection('uni-id-users').doc(item._id).update({ status: next, update_time: Date.now() })
		await loadPage(page.value)
		uni.showToast({ title: '已更新', icon: 'none' })
	} catch (e) {
		uni.showToast({ title: '更新失败', icon: 'none' })
	}
}

async function prevPage() {
	if (page.value <= 1) return
	await loadPage(page.value - 1)
}

async function nextPage() {
	await loadPage(page.value + 1)
}

onMounted(() => {
	loadPage(1)
})
</script>

<style src="../_shared/styles.css"></style>

