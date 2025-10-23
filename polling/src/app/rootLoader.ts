import { type LoaderFunction } from "react-router";
import { getUserLocalStorage, loginAndReturn, fetcher } from "@common";
import { store, persistReady, resetStore, setUser, selectUser } from "@/store";
import { loadTimeZones } from "@/store/timeZones";
import { loadGroups } from "@/store/groups";

async function init() {
	await persistReady;

	const { dispatch, getState } = store;

	const user = await getUserLocalStorage().catch(loginAndReturn);
	if (!user) throw new Error("Unable to get user");
	fetcher.setToken(user.Token); // Prime fetcher with authorization token

	const storeUser = selectUser(getState());
	if (storeUser.SAPIN !== user.SAPIN) dispatch(resetStore());
	dispatch(setUser(user)); // Make sure we have the latest user info

	await dispatch(loadGroups());
}

const oneTimeInit = init();

export const rootLoader: LoaderFunction = async () => {
	await oneTimeInit;

	const { dispatch } = store;
	dispatch(loadTimeZones());
	await dispatch(loadGroups());

	return null;
};
