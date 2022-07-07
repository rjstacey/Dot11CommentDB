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
	}

	return wrapper(axios.create(config));
}
