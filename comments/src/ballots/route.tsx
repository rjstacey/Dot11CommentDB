import { LoaderFunction, RouteObject, useRouteError } from "react-router-dom";

import { store } from "../store";
import { AccessLevel } from "../store/user";
import { selectWorkingGroupByName } from "../store/groups";

import Ballots from "./Ballots";

const ballotsLoader: LoaderFunction = async ({ params }) => {
	const { groupName } = params;
	if (!groupName) throw new Error("Route error: groupName not set");

	const { getState } = store;

	const group = selectWorkingGroupByName(getState(), groupName);
	if (!group) throw new Error("Invalid group: " + groupName);
	const access = group.permissions.ballots || AccessLevel.none;
	if (access < AccessLevel.ro)
		throw new Error("You don't have permission to view this data");

	return null;
};

export function ErrorPage() {
	const error: any = useRouteError();

	return (
		<div id="error-page">
			<h1>Error</h1>
			<p>
				<i>{error.statusText || error.message}</i>
			</p>
		</div>
	);
}

const route: RouteObject = {
	loader: ballotsLoader,
	element: <Ballots />,
	errorElement: <ErrorPage />,
};

export default route;
