import type { LoaderFunction } from "react-router";
import { fetcher, getUserLocalStorage, loginAndReturn } from "@common";

import { store, persistReady, resetStore, setUser, selectUser } from "@/store";
import { loadGroups } from "@/store/groups";
import { loadTimeZones } from "@/store/timeZones";

let p: Promise<void> | undefined;

async function init() {
	await persistReady;

	const { dispatch, getState } = store;

	const user = await getUserLocalStorage().catch(loginAndReturn);
	if (!user) throw new Error("Unable to get user");
	if (!user.Token) throw new Error("No token");
	fetcher.setToken(user.Token); // Prime fetcher with authorization token

	const storeUser = selectUser(getState());
	if (storeUser.SAPIN !== user.SAPIN) dispatch(resetStore());
	dispatch(setUser(user)); // Make sure we have the latest user info

	await dispatch(loadGroups());
}

export const rootLoader: LoaderFunction = async () => {
	const { dispatch } = store;

	if (p === undefined) {
		p = init();
	}

	await p;

	dispatch(loadTimeZones());
	dispatch(loadGroups());

	return null;
};
