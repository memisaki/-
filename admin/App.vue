<template>
	<view class="app-root">
		<slot />
	</view>
</template>

<script>
export default {
	onLaunch() {},
	onShow() {
		console.log('App Show')
		this.checkAuth()
	},
	methods: {
		checkAuth() {
			// 获取当前页面栈
			const pages = getCurrentPages()
			const currentPage = pages[pages.length - 1]
			const currentPath = currentPage ? currentPage.route : ''
			
			// 如果已经在登录页，不检查
			if (currentPath.includes('pages/login/index')) return
			
			const token = uni.getStorageSync('uni_id_token')
			const tokenExpired = uni.getStorageSync('uni_id_token_expired')
			const now = Date.now()
			
			if (!token || (tokenExpired && tokenExpired < now)) {
				// 可以在这里加个简单的防抖或只跳转一次
				uni.reLaunch({
					url: '/pages/login/index'
				})
			}
		}
	},
	onHide() {
		console.log('App Hide')
	},
}
</script>

<style>
.app-root {
	min-height: 100vh;
	background: #f6f7f9;
}
</style>

