import {saveAs} from 'file-saver'

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
	url = apiBaseUrl + url

	if (method === "GET" && params) {
		url += '?' + new URLSearchParams(params)
	}

	const options = {
		method,
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
		},
		...(params && method !== "GET" && {body: JSON.stringify(params)}),
	}

	const res = await fetch(url, options)

	return res.ok? res.json(): errHandler(res)
}

async function _getFile(url, params) {
	url = apiBaseUrl + url + '?' + new URLSearchParams(params)

	const res = await fetch(url, {method: 'GET'})

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

async function _postMultipart(url, params) {
	url = apiBaseUrl + url

	let formData = new FormData()
	for (let key of Object.keys(params)) {
		formData.append(key, params[key])
	}

	const options = {
		method: 'POST',
		body: formData
	}
	
	const res = await fetch(url, options)

	return res.ok? res.json(): errHandler(res)
}

var methods = {}

for (let m of ["GET", "POST", "PUT", "DELETE", "PATCH"]) {
	methods[m.toLowerCase()] = (...data) => _jsonMethod(m, ...data)
}

methods.getFile = _getFile
methods.postMultipart = _postMultipart

export default methods
