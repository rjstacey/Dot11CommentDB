import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { HelmetProvider, Helmet } from "react-helmet-async";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import routes from "./routes";
import { renderIcon } from "./icon";

const title = "IEEE 802 tools";
const description =
	"Tools used by the IEEE 802 LAN/MAN standards committee and its subsidiary groups";
const svgString = encodeURIComponent(
	renderToStaticMarkup(renderIcon("802", "TOOLS"))
);

const getRouter = () => createBrowserRouter(routes);

function App() {
	// Create routes on initial render. If done at init time, createBrowserRouter() will kick off groupLoader() before fetcher has been initialized.
	const router = React.useMemo(getRouter, []);
	return (
		<>
			<HelmetProvider>
				<Helmet>
					<title>{title}</title>
					<meta name="description" content={description} />
					<link rel="icon" href={`data:image/svg+xml,${svgString}`} />
				</Helmet>
				<RouterProvider router={router} />
			</HelmetProvider>
		</>
	);
}

export default App;
