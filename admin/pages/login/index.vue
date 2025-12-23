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
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref } from 'vue'
import { adminLogin } from '../../services/adminApi'

const form = ref({
	username: 'admin',
	password: 'Admin@123456',
})
const isLoading = ref(false)

async function handleLogin() {
	if (!form.value.username) {
		return uni.showToast({ title: '请输入账号', icon: 'none' })
	}
	if (!form.value.password) {
		return uni.showToast({ title: '请输入密码', icon: 'none' })
	}

	isLoading.value = true
	try {
		const res = await adminLogin({
			username: form.value.username,
			password: form.value.password,
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
			duration: 2000,
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
	box-sizing: border-box;
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
</style>

