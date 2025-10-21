import { type LoaderFunction } from "react-router";
import { getUser, loginAndReturn } from "@common";

import { store, persistReady, resetStore } from "@/store";
import { setUser, selectUser } from "@/store/user";
import { loadGroups } from "@/store/groups";
import { loadTimeZones } from "@/store/timeZones";
import { fetcher } from "@common";

let p: Promise<void> | undefined;

async function init() {
	await persistReady;

	const { dispatch, getState } = store;

	const user = await getUser().catch(loginAndReturn);
	if (!user) throw new Error("Unable to get user");
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
