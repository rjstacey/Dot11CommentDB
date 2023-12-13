import * as React from "react";
import { renderToStaticMarkup } from 'react-dom/server';
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { HelmetProvider, Helmet } from "react-helmet-async";

import routes from "./routes";
import {renderIcon} from "./icon";

const title = "802 tools | CR";
const description = "802 comment resolution tool";
const svgString = encodeURIComponent(renderToStaticMarkup(renderIcon("802", "CR")));

const getRouter = () => createBrowserRouter(routes, { basename: "/comments" });

function App() {
	// Create routes on initial render. If done at init time, createBrowserRouter() will kick off groupLoader() before fetcher has been initialized.
	const router = React.useMemo(getRouter, []);
	return (
		<HelmetProvider>
			<Helmet>
				<title>{title}</title>
				<meta name="description" content={description} />
				<link rel="icon" href={`data:image/svg+xml,${svgString}`} />
			</Helmet>
			<RouterProvider router={router} />
		</HelmetProvider>
	);
}

export default App;
