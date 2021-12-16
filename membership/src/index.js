import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
//import { PersistGate } from 'redux-persist/integration/react';

import store from './store';
import './index.css';
import App from './App';
import {userInit} from 'dot11-components/lib/user';
import * as serviceWorker from './serviceWorkerRegistration';
import reportWebVitals from './reportWebVitals';

const user = userInit();
if (!user) {
	window.location.assign(`/login?redirect=${window.location}`)
}
else {
	ReactDOM.render(
		<React.StrictMode>
			<Provider store={store}>
				<App user={user} access={user.Access} />
			</Provider>
		</React.StrictMode>,
		document.getElementById('root')
	);

	serviceWorker.register();

	// If you want to start measuring performance in your app, pass a function
	// to log results (for example: reportWebVitals(console.log))
	// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
	reportWebVitals();
}
