import { describe, expect, it, vi } from 'vitest'

vi.mock('axios', () => {
	const create = vi.fn(() => {
		return {
			interceptors: {
				request: { use: vi.fn() },
				response: { use: vi.fn() },
			},
			post: vi.fn(async (_url, _data, _config) => ({ data: { code: 200, data: { ok: true } }, config: { meta: { requestId: 'test' } } })),
		}
	})
	return { default: { create } }
})

describe('admin/services/adminApi', () => {
	it('callAdminApi 返回 data', async () => {
		const { callAdminApi } = await import('../services/adminApi.js')
		const res = await callAdminApi('x', { a: 1 })
		expect(res).toEqual({ ok: true })
	})
})

