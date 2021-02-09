import {saveAs} from 'file-saver'

const methods = {};

let jwtBearerToken;
methods.setJWT = (token) => jwtBearerToken = token;

const apiBaseUrl = ''

async function errHandler(res) {
	if (res.status === 400 &&
		res.headers.get('Content-Type').search('application/json') !== -1) {
		const ret = await res.json()
		return Promise.reject(ret.message)
	}
	let error = await res.text()
	if (!error) {
		error = new Error(res.statusText)
	}
	//console.log(detail)
	return Promise.reject(error)
}

async function _jsonMethod(method, url, params) {
	url = apiBaseUrl + url;

	const options = {method};

	if (params) {
		if (method === "GET")
			url += '?' + new URLSearchParams(params)
		else
			options.body = JSON.stringify(params)
	}

	options.headers = {
		'Accept': 'application/json',
		'Content-Type': 'application/json',
		'Authorization': `Bearer ${jwtBearerToken}`
	};

	const res = await fetch(url, options)

	return res.ok? res.json(): errHandler(res)
}

["GET", "POST", "PUT", "DELETE", "PATCH"].forEach(m => methods[m.toLowerCase()] = (...args) => _jsonMethod(m, ...args));

methods.getFile = async (url, params) => {
	url = apiBaseUrl + url + '?' + new URLSearchParams(params)

	const options = {
		method: 'GET',
		headers: {'Authorization': `Bearer ${jwtBearerToken}`}
	};

	const res = await fetch(url, options);

	if (res.ok) {
		let filename = 'download'
		const d = res.headers.get('content-disposition')
		if (d) {
			const m = d.match(/filename="(.*)"/i)
			if (m) {
				filename = m[1]
			}
		}
		saveAs(await res.blob(), filename)
		return filename
	}
	else {
		return errHandler(res)
	}
}

methods.postForFile = async (url, params, file) => {
	url = apiBaseUrl + url

	let formData = new FormData()
	formData.append('params', JSON.stringify(params))
	formData.append('file', file)

	const options = {
		method: 'POST',
		headers: {'Authorization': `Bearer ${jwtBearerToken}`},
		body: formData
	}

	const res = await fetch(url, options);

	if (res.ok) {
		let filename = 'download'
		const d = res.headers.get('content-disposition')
		if (d) {
			const m = d.match(/filename="(.*)"/i)
			if (m) {
				filename = m[1]
			}
		}
		saveAs(await res.blob(), filename)
		return filename
	}
	else {
		return errHandler(res)
	}
}

methods.postMultipart = async (url, params) => {
	url = apiBaseUrl + url

	let formData = new FormData()
	for (let key of Object.keys(params)) {
		formData.append(key, params[key])
	}

	const options = {
		method: 'POST',
		headers: {'Authorization': `Bearer ${jwtBearerToken}`},
		body: formData
	};

	const res = await fetch(url, options);

	return res.ok? res.json(): errHandler(res)
}

export default methods
