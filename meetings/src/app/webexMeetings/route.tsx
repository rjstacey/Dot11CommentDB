import type { RouteObject } from "react-router";
import { rootLoader, webexMeetingsLoader } from "./loader";
import { WebexMeetingsLayout } from "./layout";
import { WebexMeetingsMain } from "./main";

const route: RouteObject = {
	element: <WebexMeetingsLayout />,
	loader: rootLoader,
	children: [
		{
			path: ":sessionNumber",
			element: <WebexMeetingsMain />,
			loader: webexMeetingsLoader,
		},
	],
};

export default route;
