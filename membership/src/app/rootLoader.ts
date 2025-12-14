import type { LoaderFunction } from "react-router";

import { store } from "@/store";
import { loadGroups } from "@/store/groups";
import { loadTimeZones } from "@/store/timeZones";

export const rootLoader: LoaderFunction = async () => {
	const { dispatch } = store;
	dispatch(loadTimeZones());
	dispatch(loadGroups());

	return null;
};
