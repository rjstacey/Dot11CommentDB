import type { RouteObject } from "react-router";
import { indexLoader, resultsLoader } from "./laoder";
import AppError from "../errorPage";
import { ResultsLayout } from "./layout";
import { ResultsMain } from "./main";

const route: RouteObject = {
	element: <ResultsLayout />,
	children: [
		{
			index: true,
			loader: indexLoader,
			element: null,
		},
		{
			path: ":ballotId",
			loader: resultsLoader,
			element: <ResultsMain />,
			errorElement: <AppError />,
		},
	],
};

export default route;
