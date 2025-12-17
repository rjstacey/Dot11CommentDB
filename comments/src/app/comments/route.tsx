import { RouteObject } from "react-router";

import AppError from "../errorPage";
import { CommentsLayout } from "./layout";
import { CommentsMain } from "./main";
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
			element: <CommentsMain />,
			errorElement: <AppError />,
		},
	],
};

export default route;
