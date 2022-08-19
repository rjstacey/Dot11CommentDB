import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';

import configureStore from './store'
import App from './app/App';
import {getUser, logout} from 'dot11-components/lib/user';
import {fetcher} from 'dot11-components/lib';
import './index.css';

import registerServiceWorker from './registerServiceWorker';
import reportWebVitals from './reportWebVitals';

getUser()
	.then(user => {
		try {
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
