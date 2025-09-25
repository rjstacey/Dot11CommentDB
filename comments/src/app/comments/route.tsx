import { RouteObject } from "react-router";

import AppError from "../errorPage";
import CommentsLayout from "./layout";
import CommentsTable from "./table";
import { indexLoader, ballotIdLoader } from "./loader";

const route: RouteObject = {
	element: <CommentsLayout />,
	children: [
		{
			index: true,
			loader: indexLoader,
		},
		{
			path: ":ballotId",
			loader: ballotIdLoader,
			element: <CommentsTable />,
			errorElement: <AppError />,
		},
	],
};

export default route;
