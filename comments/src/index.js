import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import thunk from 'redux-thunk';
import { createLogger } from 'redux-logger';
//import { PersistGate } from 'redux-persist/integration/react';

import {store, persistor} from './store';
import {loadUsers} from './store/users';
import {loadBallots} from './store/ballots';

import App from './App';
import {userInit} from 'dot11-components/lib/user';
import registerServiceWorker from './registerServiceWorker';
import './index.css';

const user = userInit();
//console.log(user.Token)
if (!user) {
	window.location.assign(`/login?redirect=${window.location}`);
}
else {
	/*ReactDOM.render(
		<React.StrictMode>
			<Provider store={store}>
				<PersistGate persistor={persistor} >
					<App user={user} access={user.Access} />
				</PersistGate>
			</Provider>
		</React.StrictMode>,
		document.getElementById('root')
	);*/

	store.dispatch(loadUsers());
	store.dispatch(loadBallots());

	ReactDOM.render(
		<React.StrictMode>
			<Provider store={store}>
				<App user={user} access={user.Access} />
			</Provider>
		</React.StrictMode>,
		document.getElementById('root')
	);

	registerServiceWorker();
}
