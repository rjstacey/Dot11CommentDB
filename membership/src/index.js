import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';

import configureStore from './store';

import './index.css';
import App from './App';
import {getUser, logout} from 'dot11-components/lib/user';
import {fetcher} from 'dot11-components/lib';
import * as serviceWorker from './serviceWorkerRegistration';
import reportWebVitals from './reportWebVitals';

getUser()
	.then(user => {
		window.user = user;
		fetcher.setAuth(user.Token, logout);

		const {store, persistor} = configureStore();

		ReactDOM.render(
			<React.StrictMode>
				<Provider store={store}>
					<PersistGate loading={'loading...'} persistor={persistor} >
						<App user={user} access={user.Access} />
					</PersistGate>
				</Provider>
			</React.StrictMode>,
			document.getElementById('root')
		);

		serviceWorker.register();
	})
	.catch(error => {
		logout();
	});
