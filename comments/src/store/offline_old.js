//import { createOffline } from '@redux-offline/redux-offline';
/*import { createOffline } from '../offline';
import offlineConfig from '@redux-offline/redux-offline/lib/defaults';

import {fetcher} from 'dot11-components/lib';

function effect({method, url, params}) {
	return fetcher.fetch(method, url, params)
}

function discard(error, action, retries) {
	console.log('retries', retries)
	if (retries > 10)
		return true;

	if (!('status' in error)) {
		return true;
	}

	// discard http 4xx errors
	return error.status >= 400 && error.status < 500;
}

export default () => createOffline({...offlineConfig, persist: false, effect, discard});
*/