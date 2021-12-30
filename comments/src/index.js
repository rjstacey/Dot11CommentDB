import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import thunk from 'redux-thunk';
import { createLogger } from 'redux-logger';
import { PersistGate } from 'redux-persist/integration/react';

import configureStore from './store';
import {loadMembers} from './store/members';
import {loadBallots} from './store/ballots';
import {loadVotingPools} from './store/votingPools';

import App from './App';
import {getUser, logout} from 'dot11-components/lib/user';
import registerServiceWorker from './registerServiceWorker';
import './index.css';

import {fetcher} from 'dot11-components/lib';

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

		registerServiceWorker();
	})
	.catch(error => {
		console.warn(error);
		//window.location.assign(`/login?redirect=${window.location}`);
	})
