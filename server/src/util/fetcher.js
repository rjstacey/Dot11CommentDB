import axios from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';

export function createFetcher() {
	const config = {
		jar: new CookieJar(),
		withCredentials: true,
		responseType: 'text'
	}

	const fetcher = wrapper(axios.create(config));
	return fetcher;
}
