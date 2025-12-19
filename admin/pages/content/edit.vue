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
				<view class="page-title">{{ id ? '编辑内容' : '新建内容' }}</view>
				<view class="row" style="gap: 8px;">
					<view class="btn secondary" @click="back">返回</view>
					<view class="btn" @click="save" :style="{ opacity: saving ? 0.6 : 1 }">保存</view>
				</view>
			</view>

			<view class="card">
				<view class="form" style="align-items: flex-start;">
					<view class="field" style="flex: 1; min-width: 380px;">
						<view class="label">标题</view>
						<input class="input" v-model="model.title" placeholder="请输入标题" />
					</view>
					<view class="field" style="flex: 1; min-width: 220px;">
						<view class="label">状态</view>
						<picker :range="statusOptions" range-key="label" @change="onStatusChange">
							<view class="select">{{ currentStatusLabel }}</view>
						</picker>
					</view>
					<view class="field" style="flex: 1; min-width: 380px;">
						<view class="label">封面链接</view>
						<input class="input" v-model="model.cover" placeholder="https://..." />
					</view>
					<view class="field" style="flex: 1; min-width: 380px;">
						<view class="label">标签（逗号分隔）</view>
						<input class="input" v-model="model.tagsText" placeholder="例如：校园,美食" />
					</view>
					<view class="field" style="flex: 1; min-width: 100%;">
						<view class="label">正文</view>
						<textarea class="input" style="height: 260px; width: 100%;" v-model="model.body" placeholder="请输入正文内容" />
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'

const id = ref('')
const saving = ref(false)

const statusOptions = [
	{ label: '草稿', value: 'draft' },
	{ label: '已发布', value: 'published' },
	{ label: '已下架', value: 'disabled' },
]

const model = ref({
	title: '',
	status: 'draft',
	cover: '',
	tagsText: '',
	body: '',
})

const currentStatusLabel = computed(() => statusOptions.find((x) => x.value === model.value.status)?.label ?? '草稿')

function go(url) {
	uni.redirectTo({ url })
}

function back() {
	uni.navigateBack({ delta: 1 })
}

function onStatusChange(e) {
	const idx = Number(e.detail.value)
	model.value.status = statusOptions[idx]?.value ?? 'draft'
}

function toTags(tagsText) {
	const items = String(tagsText || '')
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean)
	return items
}

async function load() {
	if (!id.value) return
	try {
		if (!globalThis.uniCloud?.database) return
		const db = uniCloud.database()
		const res = await db.collection('contents').doc(id.value).get()
		const doc = res.result?.data?.[0] ?? {}
		const tags = doc.tags ?? doc.tag ?? doc.labels
		model.value = {
			title: doc.title ?? '',
			status: doc.status ?? 'draft',
			cover: doc.cover ?? doc.coverUrl ?? '',
			tagsText: Array.isArray(tags) ? tags.join(',') : typeof tags === 'string' ? tags : '',
			body: doc.body ?? doc.content ?? '',
		}
	} catch (e) {
		uni.showToast({ title: '加载失败', icon: 'none' })
	}
}

async function save() {
	if (!model.value.title.trim()) {
		uni.showToast({ title: '请填写标题', icon: 'none' })
		return
	}
	saving.value = true
	try {
		if (!globalThis.uniCloud?.database) {
			uni.showToast({ title: '未配置 uniCloud', icon: 'none' })
			return
		}
		const db = uniCloud.database()
		const payload = {
			title: model.value.title.trim(),
			status: model.value.status,
			cover: model.value.cover.trim(),
			tags: toTags(model.value.tagsText),
			body: model.value.body,
			update_time: Date.now(),
		}
		if (id.value) {
			await db.collection('contents').doc(id.value).update(payload)
		} else {
			await db.collection('contents').add({
				...payload,
				create_time: Date.now(),
			})
		}
		uni.showToast({ title: '已保存', icon: 'none' })
		setTimeout(() => {
			uni.redirectTo({ url: '/pages/content/index' })
		}, 400)
	} catch (e) {
		uni.showToast({ title: '保存失败', icon: 'none' })
	} finally {
		saving.value = false
	}
}

onLoad((query) => {
	id.value = String(query?.id ?? '')
	load()
})
</script>

<style src="../_shared/styles.css"></style>

