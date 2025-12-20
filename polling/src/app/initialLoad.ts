import type { RouteObject } from "react-router";
import { getUserLocalStorage, loginAndReturn, fetcher, User } from "@common";
import { store, persistReady, resetStore, setUser, selectUser } from "@/store";

/** Prepare the store and fetcher */
async function init() {
	await persistReady;

	let user: User;
	try {
		user = await getUserLocalStorage();
	} catch (error) {
		console.warn(error);
		await loginAndReturn();
		return;
	}
	if (!user) throw new Error("Unable to get user from local storage");
	if (!user.Token) throw new Error("No token");
	fetcher.setToken(user.Token); // Prime fetcher with autherization token

	const { dispatch, getState } = store;

	const storeUser = selectUser(getState());
	if (storeUser.SAPIN !== user.SAPIN) dispatch(resetStore());
	dispatch(setUser(user)); // Make sure we have the latest user info
}

const initialLoad = init();

export function installLoaderWrapper(routes: RouteObject[]) {
	for (const route of routes) {
		if (route.children) installLoaderWrapper(route.children);
		const loader = route.loader;
		if (typeof loader === "function") {
			route.loader = async (args) => {
				await initialLoad;
				return loader(args);
			};
		}
	}
}
