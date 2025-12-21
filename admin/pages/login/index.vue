<!-- 
  文件说明：管理员登录页面
  功能：管理员账号登录、Token存储
  作者：程世权
  创建时间：2025-12-18
-->
<template>
	<view class="login-container">
		<view class="login-box">
			<view class="brand">软工大作业 · 管理后台</view>
			<view class="title">管理员登录</view>
			
			<view class="form">
				<view class="field">
					<view class="label">账号</view>
					<input class="input" v-model="form.username" placeholder="请输入管理员账号" @confirm="handleLogin" />
				</view>
				<view class="field">
					<view class="label">密码</view>
					<input class="input" v-model="form.password" type="password" placeholder="请输入密码" @confirm="handleLogin" />
				</view>
				
				<view class="btn primary" @click="handleLogin" :class="{ loading: isLoading }">
					{{ isLoading ? '登录中...' : '登 录' }}
				</view>

				<view class="btn ghost" @click="handleBootstrap" :class="{ loading: isBootstrapping }">
					{{ isBootstrapping ? '初始化中...' : '首次使用：初始化管理员账号' }}
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref } from 'vue'

const form = ref({
	username: 'admin',
	password: ''
})
const isLoading = ref(false)
const isBootstrapping = ref(false)

async function handleBootstrap() {
	isBootstrapping.value = true
	try {
		if (!globalThis.uniCloud?.importObject) throw new Error('当前项目未启用 uniCloud，请在 HBuilderX 中先关联云服务空间')
		const adminObj = uniCloud.importObject('admin-operation')
		if (!adminObj || typeof adminObj.bootstrapAdmin !== 'function') throw new Error('云对象不可用：请确认已部署 admin-operation 云对象')
		const res = await adminObj.bootstrapAdmin({ username: 'admin', password: 'Admin@123456' })
		if (res.created) {
			form.value.username = res.username
			form.value.password = res.password
			uni.showModal({
				title: '管理员已初始化',
				content: `账号：${res.username}\n密码：${res.password}\n请立即登录`,
				showCancel: false
			})
		} else {
			uni.showModal({
				title: '已存在管理员账号',
				content: `账号：${res.username}\n请使用已设置的密码登录`,
				showCancel: false
			})
		}
	} catch (e) {
		console.error(e)
		uni.showToast({ title: e.message || '初始化失败', icon: 'none' })
	} finally {
		isBootstrapping.value = false
	}
}

async function handleLogin() {
	if (!form.value.username) {
		return uni.showToast({ title: '请输入账号', icon: 'none' })
	}

	isLoading.value = true
	try {
		if (!globalThis.uniCloud?.importObject) throw new Error('当前项目未启用 uniCloud，请在 HBuilderX 中先关联云服务空间')
		const adminObj = uniCloud.importObject('admin-operation')
		if (!adminObj || typeof adminObj.login !== 'function') throw new Error('云对象不可用：请确认已部署 admin-operation 云对象')
		const res = await adminObj.login({
			username: form.value.username,
			password: form.value.password
		})

		if (res.token) {
			uni.setStorageSync('uni_id_token', res.token)
			uni.setStorageSync('uni_id_token_expired', res.tokenExpired)
			uni.setStorageSync('current_user', res.userInfo)
			
			uni.showToast({ title: '登录成功', icon: 'success' })
			
			setTimeout(() => {
				uni.reLaunch({ url: '/pages/dashboard/index' })
			}, 1000)
		} else {
			throw new Error('登录失败，未获取到Token')
		}
	} catch (e) {
		console.error(e)
		uni.showToast({ 
			title: e.message || '登录失败，请检查账号密码', 
			icon: 'none',
			duration: 2000 
		})
	} finally {
		isLoading.value = false
	}
}
</script>

<style>
.login-container {
	min-height: 100vh;
	display: flex;
	align-items: center;
	justify-content: center;
	background-color: #f0f2f5;
	background-image: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.login-box {
	width: 400px;
	padding: 40px;
	background: #ffffff;
	border-radius: 8px;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.brand {
	font-size: 14px;
	color: #64748b;
	text-align: center;
	margin-bottom: 8px;
}

.title {
	font-size: 24px;
	font-weight: 600;
	color: #1e293b;
	text-align: center;
	margin-bottom: 32px;
}

.field {
	margin-bottom: 24px;
}

.label {
	font-size: 14px;
	color: #475569;
	margin-bottom: 8px;
	font-weight: 500;
}

.input {
	width: 100%;
	height: 44px;
	padding: 0 12px;
	border: 1px solid #cbd5e1;
	border-radius: 4px;
	font-size: 14px;
	box-sizing: border-box; /* 关键：防止padding撑大 */
	transition: border-color 0.2s;
}

.input:focus {
	border-color: #3b82f6;
	outline: none;
}

.btn {
	width: 100%;
	height: 44px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 4px;
	font-size: 16px;
	cursor: pointer;
	user-select: none;
	transition: all 0.2s;
}

.btn.primary {
	background-color: #3b82f6;
	color: #ffffff;
}

.btn.primary:hover {
	background-color: #2563eb;
}

.btn.primary:active {
	background-color: #1d4ed8;
}

.btn.loading {
	opacity: 0.7;
	cursor: not-allowed;
}

.btn.ghost {
	margin-top: 12px;
	background: transparent;
	color: #334155;
	border: 1px dashed #94a3b8;
	font-size: 14px;
}
</style>
