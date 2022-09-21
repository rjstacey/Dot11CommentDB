import axios from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import FormData from 'form-data';
import {isPlainObject} from './general';

/* Send using form-data */
function transformRequest(data, headers) {

	if (isPlainObject(data)) {
		/* convert data to form data */
		const form = new FormData();
		for (const key in data)
			form.append(key, data[key]);

		/* modify headers */
		headers['Content-Type'] = form.getHeaders()['content-type'];

		return form.getBuffer();
	}

	return data;
}

export function createIeeeFetcher() {
	const config = {
		jar: new CookieJar(),
		withCredentials: true,
		responseType: 'text',
		transformRequest,
		baseURL: 'https://imat.ieee.org'
	}

	const client = wrapper(axios.create(config));

	if (process.env.NODE_ENV === 'development') {
		client.interceptors.request.use(
			config => {
				console.log(config.method, config.url)
				if (config.data)
					console.log('data=', config.data)
				return config;
			}
		);
	}

	return client;
}
