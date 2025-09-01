import * as React from "react";
import { createBrowserRouter, RouterProvider } from "react-router";
import { Provider } from "react-redux";
import { store } from "@/store";

import { routes } from "./routes";

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./index.css";

//const getRouter = () =>
const router = createBrowserRouter(routes, { basename: "/membership" });

function App() {
	// Create routes on initial render. If done at init time, createBrowserRouter() will kick off the loaders before fetcher has been initialized.
	//const router = React.useMemo(getRouter, []);

	return (
		<React.StrictMode>
			<Provider store={store}>
				<RouterProvider router={router} />
			</Provider>
		</React.StrictMode>
	);
}

export default App;
