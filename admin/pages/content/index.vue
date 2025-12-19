<template>
	<view class="layout">
		<view class="sidebar">
			<view class="brand">软工大作业 · 管理后台</view>
			<view class="nav">
				<view class="nav-item" @click="go('/pages/dashboard/index')">数据概览</view>
				<view class="nav-item active" @click="go('/pages/content/index')">内容管理</view>
				<view class="nav-item" @click="go('/pages/user/index')">用户管理</view>
			</view>
		</view>

		<view class="content">
			<view class="page-header">
				<view class="page-title">内容管理</view>
				<view class="row" style="gap: 8px;">
					<view class="btn secondary" @click="refresh">刷新</view>
					<view class="btn" @click="createNew">新建内容</view>
				</view>
			</view>

			<view class="card">
				<view class="form">
					<view class="field">
						<view class="label">关键词</view>
						<input class="input" v-model="filters.keyword" placeholder="标题关键词" />
					</view>
					<view class="field">
						<view class="label">状态</view>
						<picker :range="statusOptions" range-key="label" @change="onStatusChange">
							<view class="select">{{ currentStatusLabel }}</view>
						</picker>
					</view>
					<view class="field">
						<view class="label">标签</view>
						<input class="input" v-model="filters.tag" placeholder="例如：美食/校园" />
					</view>
					<view class="row" style="gap: 8px;">
						<view class="btn" @click="applyFilters">查询</view>
						<view class="btn secondary" @click="resetFilters">重置</view>
					</view>
				</view>
			</view>

			<view class="table">
				<view class="thead">
					<view class="cell">标题</view>
					<view class="cell">状态</view>
					<view class="cell">标签</view>
					<view class="cell">作者</view>
					<view class="cell">创建时间</view>
					<view class="cell">操作</view>
				</view>
				<view v-for="item in rows" :key="item._id" class="trow">
					<view class="cell">{{ item.title || item._id }}</view>
					<view class="cell"><view class="muted">{{ item.status || '-' }}</view></view>
					<view class="cell"><view class="muted">{{ item.tagsText || '-' }}</view></view>
					<view class="cell"><view class="muted">{{ item.authorText || '-' }}</view></view>
					<view class="cell"><view class="muted">{{ item.createdAtText || '-' }}</view></view>
					<view class="cell">
						<view class="actions">
							<view class="link" @click="edit(item)">编辑</view>
							<view class="link" style="color:#ef4444;" @click="remove(item)">删除</view>
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
	{ label: '草稿', value: 'draft' },
	{ label: '已发布', value: 'published' },
	{ label: '已下架', value: 'disabled' },
]

const filters = ref({
	keyword: '',
	status: '',
	tag: '',
})

const page = ref(1)
const pageSize = ref(10)
const rows = ref([])

const currentStatusLabel = computed(() => statusOptions.find((x) => x.value === filters.value.status)?.label ?? '全部')

function go(url) {
	uni.redirectTo({ url })
}

function createNew() {
	uni.navigateTo({ url: '/pages/content/edit' })
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

function normalizeContent(doc) {
	const createdAt = doc.create_time ?? doc.created_at ?? doc.createdAt ?? doc.publish_time ?? doc.time
	const tags = doc.tags ?? doc.tag ?? doc.labels
	const tagsText = Array.isArray(tags) ? tags.join(',') : typeof tags === 'string' ? tags : ''
	const authorText = doc.authorName ?? doc.nickname ?? doc.username ?? doc.userName ?? doc.user_id ?? doc.userId ?? ''
	return {
		...doc,
		tagsText,
		authorText,
		createdAtText: createdAt ? formatDateTime(createdAt) : '',
	}
}

function buildWhere(db) {
	const where = {}
	if (filters.value.status) where.status = filters.value.status
	if (filters.value.tag) where.tags = db.command.in([filters.value.tag])
	if (filters.value.keyword) {
		const reg = db.RegExp({
			regexp: filters.value.keyword,
			options: 'i',
		})
		where.title = reg
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
	filters.value = { keyword: '', status: '', tag: '' }
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
		const res = await db.collection('contents').where(where).orderBy('create_time', 'desc').skip(skip).limit(pageSize.value).get()
		rows.value = (res.result?.data ?? []).map(normalizeContent)
	} catch (e) {
		uni.showToast({ title: '加载失败', icon: 'none' })
		rows.value = []
	}
}

function edit(item) {
	uni.navigateTo({ url: `/pages/content/edit?id=${encodeURIComponent(item._id)}` })
}

async function remove(item) {
	const res = await uni.showModal({ title: '确认删除', content: '删除后不可恢复，是否继续？' })
	if (!res.confirm) return
	try {
		if (!globalThis.uniCloud?.database) return
		const db = uniCloud.database()
		await db.collection('contents').doc(item._id).remove()
		uni.showToast({ title: '已删除', icon: 'none' })
		await loadPage(page.value)
	} catch (e) {
		uni.showToast({ title: '删除失败', icon: 'none' })
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

