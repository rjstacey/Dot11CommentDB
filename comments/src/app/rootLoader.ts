import { type LoaderFunction } from "react-router";
import { getUser, loginAndReturn, fetcher } from "@common";

import { store, persistReady, resetStore } from "@/store";
import { setUser, selectUser } from "@/store/user";
import { loadGroups } from "@/store/groups";
import { selectIsOnline } from "@/store/offline";

async function init() {
	await persistReady;

	const { dispatch, getState } = store;

	const user = await getUser().catch(loginAndReturn);
	if (!user) throw new Error("Unable to get user");
	fetcher.setAuth(user.Token, loginAndReturn); // Prime fetcher with autherization token

	const storeUser = selectUser(getState());
	if (storeUser.SAPIN !== user.SAPIN) dispatch(resetStore());
	dispatch(setUser(user)); // Make sure we have the latest user info

	await dispatch(loadGroups());
	console.log("end init");
}

const oneTimeInit = init();

export const rootLoader: LoaderFunction = async () => {
	const { dispatch, getState } = store;

	await oneTimeInit;

	if (selectIsOnline(getState())) dispatch(loadGroups());

	return null;
};
