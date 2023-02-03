import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';

import configureStore from './store';

import './index.css';
import App from './app/App';
import {getUser, logout} from 'dot11-components/lib/user';
import {setUser} from './store/user';
import {fetcher} from 'dot11-components/lib';
import * as serviceWorker from './serviceWorkerRegistration';

getUser()
	.then(user => {
		const root = createRoot(document.getElementById('root'));
		try {
			fetcher.setAuth(user.Token, logout);
			const {store, persistor} = configureStore();
			store.dispatch(setUser(user));
			root.render(
				<React.StrictMode>
					<Provider store={store}>
						<PersistGate loading={'loading...'} persistor={persistor} >
							<App />
						</PersistGate>
					</Provider>
				</React.StrictMode>
			);

			serviceWorker.register();
		}
		catch (error) {
			console.log(error);
		}
	})
	.catch(error => {
		console.error(error)
		logout();
	})