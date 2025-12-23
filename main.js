// main.js - 应用入口
import { createSSRApp } from 'vue'
import App from './App.vue'
import store from './store'
import api from './utils/api'

export function createApp() {
  const app = createSSRApp(App)
  
  // 使用状态管理
  app.use(store)
  
  // 注册全局API
  app.config.globalProperties.$api = api
  
  // 注册全局过滤器
  app.config.globalProperties.$filters = {
    // 格式化时间
    formatTime(timestamp) {
      if (!timestamp) return ''
      const date = new Date(timestamp)
      return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
    },
    
    // 格式化文件大小
    formatSize(bytes) {
      if (bytes === 0) return '0 B'
      const k = 1024
      const sizes = ['B', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    },
    
    // 截断文本
    truncate(text, length = 50) {
      if (!text) return ''
      if (text.length <= length) return text
      return text.substring(0, length) + '...'
    }
  }
  
  // 注册全局组件（自动注册components目录下的组件）
  const components = import.meta.globEager('./components/*.vue')
  Object.entries(components).forEach(([path, component]) => {
    const name = path.split('/').pop().replace('.vue', '')
    app.component(name, component.default)
  })
  
  return { app }
}