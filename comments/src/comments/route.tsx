import { RouteObject, LoaderFunction, useRouteError } from "react-router";
import { store } from "../store";
import { selectIsOnline } from "../store/offline";
import { AccessLevel } from "../store/user";
import { selectGroup } from "../store/groups";
import {
	loadBallots,
	selectBallotByBallotID,
	setCurrentBallot_id,
} from "../store/ballots";
import { clearComments, loadComments } from "../store/comments";

import CommentsLayout from "./layout";
import CommentsTable from "./table";

export const indexLoader: LoaderFunction = async () => {
	store.dispatch(clearComments());
	return null;
};

export const ballotIdLoader: LoaderFunction = async ({ params }) => {
	const { groupName, ballotId } = params;
	if (!groupName) throw new Error("Route error: groupName not set");
	if (!ballotId) throw new Error("Route error: ballotId not set");

	const { dispatch, getState } = store;
	const isOnline = selectIsOnline(getState());

	if (isOnline) await dispatch(loadBallots(groupName));

	const ballot = selectBallotByBallotID(getState(), ballotId);
	dispatch(setCurrentBallot_id(ballot ? ballot.id : null));
	if (ballot) {
		const group = selectGroup(getState(), ballot.groupId!);
		if (!group) throw new Error(`Group for ${ballotId} not found`);
		const access = group.permissions.comments || AccessLevel.none;
		if (access < AccessLevel.ro)
			throw new Error("You do not have permission to view this data");

		if (isOnline) dispatch(loadComments(ballot.id));
	} else {
		dispatch(clearComments());
		throw new Error(`Ballot ${ballotId} not found`);
	}
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
			errorElement: <ErrorPage />,
		},
	],
};

export default route;
