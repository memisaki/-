<!-- 
  文件说明：用户详情页面
  功能：展示用户详细信息、原始数据JSON查看
  作者：程世权
  创建时间：2025-12-18
-->
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
				<view class="page-title">用户详情</view>
				<view class="row" style="gap: 8px;">
					<view class="btn secondary" @click="back">返回</view>
				</view>
			</view>

			<view class="card">
				<view class="row" style="gap: 14px;">
					<view style="min-width: 260px;">
						<view class="label">用户ID</view>
						<view>{{ model._id || '-' }}</view>
					</view>
					<view style="min-width: 260px;">
						<view class="label">昵称/账号</view>
						<view>{{ model.displayName || '-' }}</view>
					</view>
					<view style="min-width: 260px;">
						<view class="label">手机号/邮箱</view>
						<view>{{ model.contact || '-' }}</view>
					</view>
					<view style="min-width: 260px;">
						<view class="label">角色</view>
						<view>{{ model.roleText || '-' }}</view>
					</view>
					<view style="min-width: 260px;">
						<view class="label">状态</view>
						<view>{{ model.status || '-' }}</view>
					</view>
					<view style="min-width: 260px;">
						<view class="label">注册时间</view>
						<view>{{ model.createdAtText || '-' }}</view>
					</view>
				</view>
			</view>

			<view class="card" style="margin-top: 12px;">
				<view style="font-weight:600; color:#1f2329;">原始数据</view>
				<view class="muted" style="margin-top: 10px; white-space: pre-wrap; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;">
					{{ rawText }}
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'

const id = ref('')
const raw = ref({})

function go(url) {
	uni.redirectTo({ url })
}

function back() {
	uni.navigateBack({ delta: 1 })
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

const model = computed(() => {
	const doc = raw.value || {}
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
})

const rawText = computed(() => {
	try {
		return JSON.stringify(raw.value ?? {}, null, 2)
	} catch (e) {
		return String(raw.value ?? '')
	}
})

async function load() {
	try {
		if (!globalThis.uniCloud?.database) return
		const db = uniCloud.database()
		const res = await db.collection('uni-id-users').doc(id.value).get()
		raw.value = res.result?.data?.[0] ?? {}
	} catch (e) {
		uni.showToast({ title: '加载失败', icon: 'none' })
		raw.value = {}
	}
}

onLoad((query) => {
	id.value = String(query?.id ?? '')
	load()
})
</script>

<style src="../_shared/styles.css"></style>

