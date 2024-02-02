import * as React from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";

import { store, persistor, resetStore } from "./store";
import { setUser, selectUser, type User } from "./store/user";
import App from "./app";
import { getUser, logout, fetcher } from "dot11-components";
import "./index.css";

import registerServiceWorker from "./registerServiceWorker";
import reportWebVitals from "./reportWebVitals";

function persistGate(done: boolean, user: User) {
	if (!done) {
		return "loading...";
	}
	const storedUser = selectUser(store.getState());
	if (storedUser.SAPIN !== user.SAPIN) {
		store.dispatch(resetStore());
	}
	store.dispatch(setUser(user));
	return <App />;
}

getUser()
	.then((user) => {
		const root = createRoot(document.getElementById("root")!);
		try {
			fetcher.setAuth(user.Token, logout);
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
			reportWebVitals();
		} catch (error) {
			console.log(error);
		}
	})
	.catch((error) => {
		console.error(error);
		logout();
	});
