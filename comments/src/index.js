import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import thunk from 'redux-thunk';
import { createLogger } from 'redux-logger';
//import { PersistGate } from 'redux-persist/integration/react';

import {store, persistor} from './store';
import {loadMembers} from './store/members';
import {loadBallots} from './store/ballots';
import {loadVotingPools} from './store/votingPools';

import App from './App';
import {userInit} from 'dot11-components/lib/user';
import registerServiceWorker from './registerServiceWorker';
import './index.css';

// Get user. If we are unable to do this the user has not login in.
window.user = userInit();

if (!window.user) {
	window.location.assign(`/login?redirect=${window.location}`);
}
else {
	/*ReactDOM.render(
		<React.StrictMode>
			<Provider store={store}>
				<PersistGate loading={'loading...'} persistor={persistor} >
					<App user={user} access={user.Access} />
				</PersistGate>
			</Provider>
		</React.StrictMode>,
		document.getElementById('root')
	);*/

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
