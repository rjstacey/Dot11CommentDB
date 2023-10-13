import axios from "axios";
import type { AxiosInstance, AxiosRequestConfig } from "axios";
import { CookieJar } from "tough-cookie";
import { HttpCookieAgent, HttpsCookieAgent } from "http-cookie-agent/http";
import FormData from "form-data";
import { isPlainObject } from "./general";
import { URLSearchParams } from "url";

/* Send using form-data */
function transformRequest(data, headers) {
	if (isPlainObject(data)) {
		/* convert data to form data */
		//console.log(data)
		const form = new FormData();
		for (const key in data) form.append(key, data[key]);
		/* modify headers */
		headers.post["Content-Type"] = form.getHeaders()["content-type"];

		return form; //.getBuffer();
	}
	return data;
}

const urlEncodeParams = (data) => new URLSearchParams(data).toString();

export function createIeeeClient() {
	const jar = new CookieJar();
	const config: AxiosRequestConfig = {
		responseType: "text",
		transformRequest: urlEncodeParams,
		baseURL: "https://imat.ieee.org",
		httpAgent: new HttpCookieAgent({ cookies: { jar } }),
		httpsAgent: new HttpsCookieAgent({ cookies: { jar } }),
	};

	const client = axios.create(config);

	//client.cookies = {};
	/*
	if (process.env.NODE_ENV === 'development') {
		client.interceptors.request.use(
			config => {
				//console.log(config.method, config.url)
				//const cookies = Object.entries(client.cookies).map(([key, value]) => `${key}=${value}`).join('; ');
				//if (cookies)
				//	config.headers['Cookie'] = cookies;
				//console.log('req: ', config.headers)
				//console.log(config)
				//if (config.data)
				//	console.log('data=', config.data)
				return config;
			}
		);
		client.interceptors.response.use(
			response => {
				//console.log(config.method, config.url)
				//console.log('jar:', jar)
				console.log('res:', response.headers)
				//const cookies = response.headers['set-cookie'];
				//if (Array.isArray(cookies)) {
				//	cookies.forEach(cookie => {
				//		cookie = (cookie + "").split(";").shift();
				//		const [key, value] = cookie.split('=');
				//		if (key && value)
				//			client.cookies[key] = value;
				//	})
				//}
				//console.log(client.cookies)
				//if (config.data)
				//	console.log('data=', config.data)
				return response;
			}
		);
	}
	*/
	return client;
}
