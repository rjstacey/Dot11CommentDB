import * as React from "react";
import { createBrowserRouter, RouterProvider } from "react-router";
import { Provider } from "react-redux";
import { store } from "@/store";

import { routes } from "./routes";

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "@common/icons/icons.css";
import "./index.css";

const router = createBrowserRouter(routes, { basename: "/meetings" });

function App() {
	return (
		<React.StrictMode>
			<Provider store={store}>
				<RouterProvider router={router} />
			</Provider>
		</React.StrictMode>
	);
}

export default App;
