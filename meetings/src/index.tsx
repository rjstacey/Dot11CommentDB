import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';

import { configureStore } from './store'
import App from './app';
import {getUser, logout, fetcher} from 'dot11-components';
import './index.css';

import registerServiceWorker from './registerServiceWorker';
import reportWebVitals from './reportWebVitals';

getUser()
	.then(user => {
		const root = createRoot(document.getElementById('root')!);
		try {
			fetcher.setAuth(user.Token, logout);
			const {store, persistor} = configureStore(user);
			root.render(
				<React.StrictMode>
					<Provider store={store}>
						<PersistGate loading={'loading...'} persistor={persistor} >
							<App />
						</PersistGate>
					</Provider>
				</React.StrictMode>
			);
			registerServiceWorker();
			reportWebVitals();
		}
		catch (error) {
			console.log(error);
		}
	})
	.catch(error => {
		console.error(error)
		logout();
	})
