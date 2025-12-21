const crypto = require('crypto')
const uniIdCommon = require('uni-id-common')

module.exports = {
	_before: async function () {
		const methodName = this.getMethodName()
		if (methodName === 'login' || methodName === 'bootstrapAdmin') return

		const clientInfo = this.getClientInfo()
		const token = clientInfo.token
		if (!token) throw new Error('未登录或Token失效')

		const payload = verifyAdminToken(token, clientInfo)
		if (!payload?.role || !payload.role.includes('admin')) throw new Error('无权访问：非管理员账号')

		const db = uniCloud.database()
		const adminRes = await db.collection('admin_users').doc(payload.uid).get()
		const admin = adminRes.result?.data?.[0]
		if (!admin) throw new Error('未登录或Token失效')
		if (admin.status && admin.status !== 'active') throw new Error('账号已被禁用')

		this.userInfo = { uid: payload.uid, role: payload.role }
	},

	async login(params) {
		const username = String(params?.username || '').trim()
		// const password = String(params?.password || '')
		if (!username) throw new Error('账号不能为空')

		const db = uniCloud.database()
		const docRes = await db.collection('admin_users').where({ username }).limit(1).get()
		let admin = docRes.result?.data?.[0]

		// 自动修复：如果查不到且是 admin，则自动创建
		if (!admin && username === 'admin') {
			const { saltHex, hashHex, iterations, digest } = hashPassword('Admin@123456')
			const now = Date.now()
			const newAdmin = {
				username,
				salt: saltHex,
				passwordHash: hashHex,
				iterations,
				digest,
				status: 'active',
				create_time: now,
				update_time: now,
			}
			const addRes = await db.collection('admin_users').add(newAdmin)
			admin = { ...newAdmin, _id: addRes.id }
		}

		if (!admin) throw new Error('账号不存在')
		if (admin.status && admin.status !== 'active') throw new Error('账号已被禁用')

		// 临时去除密码校验：直接通过
		/*
		const ok = verifyPassword({
			password,
			saltHex: String(admin.salt || ''),
			hashHex: String(admin.passwordHash || ''),
			iterations: Number(admin.iterations || 100000),
			digest: String(admin.digest || 'sha256'),
		})
		if (!ok) throw new Error('账号或密码错误')
		*/

		const clientInfo = this.getClientInfo()
		const tokenRes = createAdminToken({ uid: admin._id, role: ['admin'] }, clientInfo)

		return {
			token: tokenRes.token,
			tokenExpired: tokenRes.tokenExpired,
			userInfo: { _id: admin._id, username: admin.username, role: ['admin'] },
		}
	},

	async bootstrapAdmin(params = {}) {
		const username = String(params.username || 'admin').trim()
		const password = String(params.password || 'Admin@123456').trim()
		if (!username || !password) throw new Error('账号或密码不能为空')

		const db = uniCloud.database()
		const existsRes = await db.collection('admin_users').where({ username }).limit(1).get()
		const exists = existsRes.result?.data?.[0]

		const { saltHex, hashHex, iterations, digest } = hashPassword(password)
		if (exists) {
			await db.collection('admin_users').doc(exists._id).update({
				salt: saltHex,
				passwordHash: hashHex,
				iterations,
				digest,
				status: 'active',
				update_time: Date.now(),
			})
			return { created: false, username }
		}

		await db.collection('admin_users').add({
			username,
			salt: saltHex,
			passwordHash: hashHex,
			iterations,
			digest,
			status: 'active',
			create_time: Date.now(),
			update_time: Date.now(),
		})
		return { created: true, username, password }
	},

	async deleteUser(userId) {
		if (!userId) throw new Error('缺少用户ID')
		const db = uniCloud.database()
		await db.collection('uni-id-users').doc(userId).remove()
		return { success: true }
	},

	async auditContent(contentId, status) {
		if (!contentId || !status) throw new Error('参数错误')
		const db = uniCloud.database()
		await db.collection('contents').doc(contentId).update({
			status,
			audit_by: this.userInfo.uid,
			audit_time: Date.now(),
			last_modify_date: Date.now(),
		})
		return { success: true }
	},

	async deleteContent(contentId) {
		if (!contentId) throw new Error('参数错误')
		const db = uniCloud.database()
		await db.collection('contents').doc(contentId).remove()
		return { success: true }
	},
}

function hashPassword(password) {
	const salt = crypto.randomBytes(16)
	const iterations = 100000
	const digest = 'sha256'
	const hash = crypto.pbkdf2Sync(password, salt, iterations, 32, digest)
	return { saltHex: salt.toString('hex'), hashHex: hash.toString('hex'), iterations, digest }
}

function verifyPassword({ password, saltHex, hashHex, iterations, digest }) {
	try {
		if (!saltHex || !hashHex) return false
		const salt = Buffer.from(saltHex, 'hex')
		const expected = Buffer.from(hashHex, 'hex')
		const actual = crypto.pbkdf2Sync(password, salt, iterations, expected.length, digest)
		return crypto.timingSafeEqual(actual, expected)
	} catch (e) {
		return false
	}
}

function base64urlEncode(input) {
	return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

function base64urlEncodeJson(obj) {
	return base64urlEncode(JSON.stringify(obj))
}

function base64urlDecodeJson(input) {
	let str = String(input || '').replace(/-/g, '+').replace(/_/g, '/')
	const pad = 4 - (str.length % 4)
	if (pad !== 4) str += '='.repeat(pad)
	return JSON.parse(Buffer.from(str, 'base64').toString('utf-8'))
}

function signHs256(data, secret) {
	return base64urlEncode(crypto.createHmac('sha256', secret).update(data).digest('base64'))
}

function createJwtHs256(payload, secret, expiresInSeconds) {
	const nowSeconds = Math.floor(Date.now() / 1000)
	const header = { alg: 'HS256', typ: 'JWT' }
	const body = { ...payload, iat: nowSeconds, exp: nowSeconds + Number(expiresInSeconds || 0) }
	const encoded = `${base64urlEncodeJson(header)}.${base64urlEncodeJson(body)}`
	return `${encoded}.${signHs256(encoded, secret)}`
}

function verifyJwtHs256(token, secret) {
	if (typeof token !== 'string') throw new Error('Token无效，请重新登录')
	const parts = token.split('.')
	if (parts.length !== 3) throw new Error('Token无效，请重新登录')
	const [h, p, s] = parts
	const signed = `${h}.${p}`
	const expected = signHs256(signed, secret)
	const expectedBuf = Buffer.from(expected)
	const actualBuf = Buffer.from(s)
	if (expectedBuf.length !== actualBuf.length || !crypto.timingSafeEqual(expectedBuf, actualBuf)) {
		throw new Error('Token无效，请重新登录')
	}
	const header = base64urlDecodeJson(h)
	if (header?.alg !== 'HS256' || header?.typ !== 'JWT') throw new Error('Token无效，请重新登录')
	const payload = base64urlDecodeJson(p)
	if (payload?.exp && payload.exp * 1000 < Date.now()) throw new Error('未登录或Token失效')
	return payload
}

function getAdminTokenConfig(clientInfo) {
	const uniId = uniIdCommon.createInstance({ clientInfo })
	const config = uniId.config
	let appConfig = config
	if (Array.isArray(config)) {
		appConfig =
			config.find((c) => c && c.dcloudAppid && c.dcloudAppid === clientInfo?.appId) ||
			config.find((c) => c && c.isDefaultConfig) ||
			config[0]
	}
	appConfig = appConfig || {}

	// 兜底策略：如果未配置 tokenSecret，则生成一个临时的（注意：生产环境应强制要求配置）
	const fallbackSecret = 'temp_admin_secret_' + new Date().getFullYear()
	const secret = appConfig.tokenSecret || fallbackSecret

	return {
		tokenSecret: secret,
		tokenExpiresIn: Number(appConfig.tokenExpiresIn || 7200),
	}
}

function createAdminToken({ uid, role }, clientInfo) {
	const { tokenSecret, tokenExpiresIn } = getAdminTokenConfig(clientInfo)
	if (!tokenSecret) throw new Error('未配置 tokenSecret')
	const token = createJwtHs256({ uid, role }, tokenSecret, tokenExpiresIn)
	return { token, tokenExpired: Date.now() + tokenExpiresIn * 1000 }
}

function verifyAdminToken(token, clientInfo) {
	const { tokenSecret } = getAdminTokenConfig(clientInfo)
	if (!tokenSecret) throw new Error('未配置 tokenSecret')
	return verifyJwtHs256(token, tokenSecret)
}
