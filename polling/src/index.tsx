import * as React from "react";
import { createRoot } from "react-dom/client";
import { getUser, loginAndReturn, fetcher } from "dot11-components";
import { register as registerServiceWorker } from "./serviceWorkerRegistration";

import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";

import { store, persistor, resetStore } from "@/store";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectUser, setUser, type User } from "@/store/user";

import "./index.css";
import App from "./app";

function AppVerifySameUser({ user }: { user: User }) {
	const dispatch = useAppDispatch();
	const storeUser = useAppSelector(selectUser);

	React.useEffect(() => {
		if (storeUser.SAPIN !== user.SAPIN) dispatch(resetStore());
		dispatch(setUser(user)); // Make sure we have the latest user info
	}, []);

	return <App />;
}

function AppInitStore({ user }: { user: User }) {
	return (
		<React.StrictMode>
			<Provider store={store}>
				<PersistGate loading="Loading..." persistor={persistor}>
					<AppVerifySameUser user={user} />
				</PersistGate>
			</Provider>
		</React.StrictMode>
	);
}

getUser()
	.then((user) => {
		try {
			fetcher.setAuth(user.Token, loginAndReturn); // Prime fetcher with autherization token
			const root = createRoot(document.getElementById("root")!);
			registerServiceWorker();
			root.render(<AppInitStore user={user} />);
		} catch (error) {
			console.log(error);
		}
	})
	.catch((error) => {
		console.error(error);
		loginAndReturn();
	});
