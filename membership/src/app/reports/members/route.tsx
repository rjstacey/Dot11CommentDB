import * as React from "react";
import { RouteObject } from "react-router";
import { membersLoader } from "../../members/loader";

const MembersReport = React.lazy(() => import("."));

export const route: RouteObject = {
	loader: membersLoader,
	element: (
		<React.Suspense fallback={<div>Loading...</div>}>
			<MembersReport />
		</React.Suspense>
	),
};
