import React from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import routes from "./routes";

const getRouter = () => createBrowserRouter(routes, { basename: "/polling" });

function App() {
	// Create routes on initial render. If done at init time, createBrowserRouter() will kick off the loaders before fetcher has been initialized.
	const router = React.useMemo(getRouter, []);

	return <RouterProvider router={router} />;
}

export default App;
