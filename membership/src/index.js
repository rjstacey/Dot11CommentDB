import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux'
import store from './store'
import './index.css';
import App from './App';
import {userInit} from 'dot11-components/lib/user'
import reportWebVitals from './reportWebVitals';

const LOGIN_STORAGE = 'User';

function loginUserInit() {
	// Get user from local storage. This may fail if the browser has certain privacy settings.
	let user;
	try {user = JSON.parse(localStorage.getItem(LOGIN_STORAGE))} catch (err) {/* ignore errors */}
	/*if (user && user.Token)
		fetcher.setJWT(user.Token);*/
	return user;
}

const user = userInit();
console.log('got', user)
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

	// If you want to start measuring performance in your app, pass a function
	// to log results (for example: reportWebVitals(console.log))
	// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
	reportWebVitals();
}
