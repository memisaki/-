import { createHttpClient } from './http'

const http = createHttpClient()

function normalizeAdminApiResult(result, requestId) {
	const payload = result || {}
	if (payload.code !== 200) {
		const err = new Error(payload.message || '请求失败')
		err.code = payload.code ?? 500
		err.requestId = requestId
		throw err
	}
	return payload.data
}

async function callAdminApiFallback(action, data = {}) {
	if (!globalThis.uniCloud?.callFunction) throw new Error('当前项目未启用 uniCloud，请在 HBuilderX 中先关联云服务空间')
	const token = uni.getStorageSync('uni_id_token')
	const res = await uniCloud.callFunction({
		name: 'admin-api',
		data: { action, token, ...data },
	})
	const result = res.result || {}
	if (result.code !== 200) throw new Error(result.message || '请求失败')
	return result.data
}

export async function callAdminApi(action, data = {}) {
	try {
		const resp = await http.post('unicloud://callFunction/admin-api', { action, ...data }, { meta: { kind: 'admin-api' } })
		return normalizeAdminApiResult(resp.data, resp?.config?.meta?.requestId)
	} catch (e) {
		const code = e?.code
		if (code === 'UNIU_CLOUD_NOT_READY' || code === 'UNIU_CLOUD_OBJECT_NOT_READY' || code === 'UNSUPPORTED_URL') {
			return await callAdminApiFallback(action, data)
		}
		throw e
	}
}

export async function adminLogin({ username, password }) {
	const resp = await http.post('unicloud://object/admin-operation/login', { username, password }, { meta: { kind: 'admin-operation' } })
	return resp.data
}

