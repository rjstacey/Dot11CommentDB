import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';

import { store, persistor, resetStore } from './store';
import { selectUser, setUser, type User } from './store/user';

import './index.css';
import App from './app';
import { fetcher, getUser, logout } from 'dot11-components';
import registerServiceWorker from './registerServiceWorker';

function persistGate(done: boolean, user: User) {
	if (!done)
		return 'loading...';
	const storedUser = selectUser(store.getState());
	if (storedUser.SAPIN !== user.SAPIN)
		store.dispatch(resetStore());
	store.dispatch(setUser(user));
	return <App />
}

getUser()
	.then(user => {
		const root = createRoot(document.getElementById('root')!);
		try {
			fetcher.setAuth(user.Token, logout);
			root.render(
				<React.StrictMode>
					<Provider store={store}>
						<PersistGate persistor={persistor} >
							{(done) => persistGate(done, user)}
						</PersistGate>
					</Provider>
				</React.StrictMode>
			);
			registerServiceWorker();
		}
		catch (error) {
			console.log(error);
		}
	})
	.catch(error => {
		console.error(error)
		logout();
	})
