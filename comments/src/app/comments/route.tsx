import { RouteObject } from "react-router";

import AppError from "../errorPage";
import CommentsLayout from "./layout";
import CommentsTable from "./table";
import { indexLoader, commentsLoader } from "./loader";

const route: RouteObject = {
	element: <CommentsLayout />,
	children: [
		{
			index: true,
			loader: indexLoader,
			element: null,
		},
		{
			path: ":ballotId",
			loader: commentsLoader,
			element: <CommentsTable />,
			errorElement: <AppError />,
		},
	],
};

export default route;
