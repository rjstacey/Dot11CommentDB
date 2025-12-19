import type { LoaderFunction } from "react-router";
import { store } from "@/store";
import { loadGroups } from "@/store/groups";
import { selectIsOnline } from "@/store/offline";

export const rootLoader: LoaderFunction = async () => {
	const { dispatch, getState } = store;

	if (selectIsOnline(getState())) await dispatch(loadGroups());

	return null;
};
