import { LoaderFunction } from "react-router";

import { store } from "@/store";
import { selectIsOnline } from "@/store/offline";
import { loadEpolls } from "@/store/epolls";

import { rootLoader } from "../../rootLoader";

export const loader: LoaderFunction = async (args) => {
	await rootLoader(args);

	const { groupName } = args.params;
	if (!groupName) throw new Error("Route error: groupName not set");

	const { dispatch, getState } = store;
	if (selectIsOnline(getState())) {
		dispatch(loadEpolls(groupName));
	}
	return null;
};
