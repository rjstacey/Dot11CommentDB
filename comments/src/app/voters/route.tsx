import type { RouteObject } from "react-router";
import { indexLoader, votersLoader } from "./loader";
import { VotersLayout } from "./layout";
import { VotersMain } from "./main";

const route: RouteObject = {
	element: <VotersLayout />,
	children: [
		{
			index: true,
			loader: indexLoader,
			element: null,
		},
		{
			path: ":ballotId",
			loader: votersLoader,
			element: <VotersMain />,
		},
	],
};

export default route;
