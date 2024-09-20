import React from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";

import { getUser, loginAndReturn, fetcher } from "dot11-components";

import { store, persistor, resetStore } from "./store";
import { selectUser, setUser, type User } from "./store/user";

import "./index.css";
import App from "./app";

// @ts-ignore
import * as serviceWorker from "./serviceWorkerRegistration";

function persistGate(done: boolean, user: User) {
	if (!done) {
		return "loading...";
	}

	const storedUser = selectUser(store.getState());
	if (storedUser.SAPIN !== user.SAPIN) {
		store.dispatch(resetStore());
	}

	fetcher.setAuth(user.Token, loginAndReturn); // Prime fetcher with autherization token
	store.dispatch(setUser(user)); // Make sure we have the latest user info

	return <App />;
}

getUser()
	.then((user) => {
		const root = createRoot(document.getElementById("root")!);
		try {
			root.render(
				<React.StrictMode>
					<Provider store={store}>
						<PersistGate persistor={persistor}>
							{(done) => persistGate(done, user)}
						</PersistGate>
					</Provider>
				</React.StrictMode>
			);

			serviceWorker.register();
		} catch (error) {
			console.log(error);
		}
	})
	.catch((error) => {
		console.error(error);
		loginAndReturn();
	});
