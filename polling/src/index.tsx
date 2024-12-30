import React from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";

import { getUser, loginAndReturn, fetcher } from "dot11-components";

import { store, persistor, resetStore } from "./store";
import { selectUser, setUser, type User } from "./store/user";
import { register as registerServiceWorker } from "./serviceWorkerRegistration";

import "./index.css";
import App from "./app";

function persistGate(done: boolean, user: User) {
	const { dispatch, getState } = store;

	if (!done) return "loading...";

	const storeUser = selectUser(getState());
	if (storeUser.SAPIN !== user.SAPIN) dispatch(resetStore());

	dispatch(setUser(user)); // Make sure we have the latest user info

	return <App />;
}

getUser()
	.then((user) => {
		fetcher.setAuth(user.Token, loginAndReturn); // Prime fetcher with autherization token
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

			registerServiceWorker();
		} catch (error) {
			console.log(error);
		}
	})
	.catch((error) => {
		console.error(error);
		loginAndReturn();
	});
