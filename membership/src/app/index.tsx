import * as React from "react";
import { createBrowserRouter, RouterProvider } from "react-router";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";

import { store, persistor, resetStore } from "@/store";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectUser, setUser, type User } from "@/store/user";

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./index.css";
import { routes } from "./routes";

const getRouter = () =>
	createBrowserRouter(routes, { basename: "/membership" });

function App() {
	// Create routes on initial render. If done at init time, createBrowserRouter() will kick off the loaders before fetcher has been initialized.
	const router = React.useMemo(getRouter, []);

	return <RouterProvider router={router} />;
}

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

export default AppInitStore;
