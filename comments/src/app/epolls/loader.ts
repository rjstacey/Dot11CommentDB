import { LoaderFunction } from "react-router";

import { store } from "@/store";
import { selectIsOnline } from "@/store/offline";
import { loadEpolls, selectEpollsState } from "@/store/epolls";

export function refresh() {
	const { dispatch, getState } = store;
	const { groupName, n } = selectEpollsState(getState());
	if (groupName) dispatch(loadEpolls(groupName, n, true));
}

export const loader: LoaderFunction = async ({ params }) => {
	const { groupName } = params;
	if (!groupName) throw new Error("Route error: groupName not set");

	const { dispatch, getState } = store;
	if (selectIsOnline(getState())) {
		dispatch(loadEpolls(groupName));
	}
	return null;
};
