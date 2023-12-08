import * as React from "react";
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { HelmetProvider, Helmet } from 'react-helmet-async';

import routes from "./routes";

const title = '802 tools | Meetings';
const description = 'Manage session and telecon meetings';

const getRouter = () => createBrowserRouter(routes, { basename: '/meetings' });

function App() {
	// Create routes on initial render. If done at init time, createBrowserRouter() will kick off groupLoader() before fetcher has been initialized.
	const router = React.useMemo(getRouter, []);
	return (
		<HelmetProvider>
			<Helmet>
				<title>{title}</title>
				<meta name='description' content={description} />
			</Helmet>
			<RouterProvider router={router} />
		</HelmetProvider>
	)
}

export default App;
