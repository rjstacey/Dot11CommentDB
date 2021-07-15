import React from 'react'
import ReactDOM from 'react-dom'
import { Provider } from 'react-redux'
import store from './store'
import App from './App'
import {userInit} from 'dot11-components/lib/user'
import registerServiceWorker from './registerServiceWorker'
import './index.css'

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

	registerServiceWorker();
}
