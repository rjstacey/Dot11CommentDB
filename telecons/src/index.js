import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import configureStore from './store'
import {getUser, logout} from 'dot11-components/lib/user';
import {fetcher} from 'dot11-components/lib';
import './index.css';
import App from './App';

import registerServiceWorker from './registerServiceWorker';
import reportWebVitals from './reportWebVitals';

getUser()
	.then(user => {
		try {
			window.user = user;
			fetcher.setAuth(user.Token, logout);
			const {store} = configureStore();
			ReactDOM.render(
				<React.StrictMode>
					<Provider store={store}>
						<App user={user} access={user.Access} />
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
