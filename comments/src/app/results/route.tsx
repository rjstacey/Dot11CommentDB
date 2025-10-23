import type { RouteObject, LoaderFunction } from "react-router";
import { AccessLevel } from "@common";
import { store } from "@/store";
import { selectIsOnline } from "@/store/offline";
import {
	loadBallots,
	selectBallotByBallotID,
	setCurrentBallot_id,
} from "@/store/ballots";
import { selectGroup } from "@/store/groups";
import { clearResults, loadResults } from "@/store/results";

import { rootLoader } from "../rootLoader";

import AppError from "../errorPage";
import ResultsLayout from "./layout";
import ResultsTable from "./table";

const indexLoader: LoaderFunction = async (args) => {
	await rootLoader(args);

	store.dispatch(clearResults());
	return null;
};

const ballotIdLoader: LoaderFunction = async (args) => {
	await rootLoader(args);

	const { groupName, ballotId } = args.params;
	if (!groupName) throw new Error("Route error: groupName not set");
	if (!ballotId) throw new Error("Route error: ballotId not set");

	const { dispatch, getState } = store;
	const isOnline = selectIsOnline(getState());

	if (isOnline) await dispatch(loadBallots(groupName));

	const ballot = selectBallotByBallotID(getState(), ballotId);
	if (ballot) {
		dispatch(setCurrentBallot_id(ballot.id));

		const group = selectGroup(getState(), ballot.groupId!);
		if (!group) throw new Error(`Group for ${ballotId} not found`);
		const access = group.permissions.results || AccessLevel.none;
		if (access < AccessLevel.ro)
			throw new Error("You do not have permission to view this data");

		if (isOnline) dispatch(loadResults(ballot.id));
	} else {
		dispatch(clearResults());
		throw new Error(`Ballot ${ballotId} not found`);
	}
	return null;
};

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
			loader: ballotIdLoader,
			element: <ResultsTable />,
			errorElement: <AppError />,
		},
	],
};

export default route;
