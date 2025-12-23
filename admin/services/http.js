import axios from 'axios'

function createRequestId() {
	return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function createApiError(message, extras = {}) {
	const err = new Error(message || '请求失败')
	for (const [k, v] of Object.entries(extras)) err[k] = v
	return err
}

function normalizeConfigData(data) {
	if (!data) return {}
	if (typeof data === 'string') {
		try {
			const parsed = JSON.parse(data)
			return parsed && typeof parsed === 'object' ? parsed : {}
		} catch {
			return {}
		}
	}
	if (typeof data === 'object') return data
	return {}
}

async function unicloudAdapter(config) {
	const url = String(config.url || '')
	const data = normalizeConfigData(config.data)

	if (url.startsWith('unicloud://callFunction/')) {
		if (!globalThis.uniCloud?.callFunction) {
			throw createApiError('当前项目未启用 uniCloud，请在 HBuilderX 中先关联云服务空间', {
				code: 'UNIU_CLOUD_NOT_READY',
				requestId: config?.meta?.requestId,
			})
		}
		const name = url.slice('unicloud://callFunction/'.length)
		const res = await uniCloud.callFunction({ name, data })
		return {
			data: res.result,
			status: 200,
			statusText: 'OK',
			headers: {},
			config,
			request: null,
		}
	}

	if (url.startsWith('unicloud://object/')) {
		if (!globalThis.uniCloud?.importObject) {
			throw createApiError('云对象不可用：请确认已部署云对象', {
				code: 'UNIU_CLOUD_OBJECT_NOT_READY',
				requestId: config?.meta?.requestId,
			})
		}
		const rest = url.slice('unicloud://object/'.length)
		const slash = rest.indexOf('/')
		const objectName = slash >= 0 ? rest.slice(0, slash) : rest
		const method = slash >= 0 ? rest.slice(slash + 1) : ''
		const obj = uniCloud.importObject(objectName)
		if (!obj || typeof obj[method] !== 'function') {
			throw createApiError('云对象不可用：请确认已部署云对象', {
				code: 'UNIU_CLOUD_OBJECT_METHOD_NOT_FOUND',
				requestId: config?.meta?.requestId,
			})
		}
		const result = await obj[method](data)
		return {
			data: result,
			status: 200,
			statusText: 'OK',
			headers: {},
			config,
			request: null,
		}
	}

	throw createApiError('不支持的请求地址', {
		code: 'UNSUPPORTED_URL',
		requestId: config?.meta?.requestId,
	})
}

export function createHttpClient() {
	const client = axios.create({
		timeout: 20000,
		adapter: unicloudAdapter,
		transformRequest: [(data) => data],
	})

	client.interceptors.request.use((config) => {
		const requestId = createRequestId()
		const startedAt = Date.now()
		config.meta = { ...(config.meta || {}), requestId, startedAt }

		const kind = config?.meta?.kind
		if (kind === 'admin-api') {
			const token = uni.getStorageSync('uni_id_token')
			const tokenExpired = uni.getStorageSync('uni_id_token_expired')
			const now = Date.now()
			if (!token || (tokenExpired && tokenExpired < now)) {
				throw createApiError('未登录或Token失效', { code: 401, requestId })
			}
			const origin = normalizeConfigData(config.data)
			config.data = { ...origin, token }
		}

		console.info('[api:req]', {
			requestId,
			url: config.url,
			kind,
			action: normalizeConfigData(config?.data)?.action,
		})

		return config
	})

	client.interceptors.response.use(
		(resp) => {
			const meta = resp?.config?.meta || {}
			const ms = meta.startedAt ? Date.now() - meta.startedAt : undefined

			console.info('[api:res]', {
				requestId: meta.requestId,
				url: resp?.config?.url,
				kind: meta.kind,
				action: normalizeConfigData(resp?.config?.data)?.action,
				ms,
			})

			return resp
		},
		(error) => {
			const config = error?.config || {}
			const meta = config?.meta || {}
			const ms = meta.startedAt ? Date.now() - meta.startedAt : undefined

			console.error('[api:err]', {
				requestId: meta.requestId,
				url: config.url,
				kind: meta.kind,
				action: normalizeConfigData(config?.data)?.action,
				ms,
				message: error?.message,
			})

			return Promise.reject(error)
		},
	)

	return client
}

