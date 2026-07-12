import { getUserLocalStorage, fetcher, type User } from "@common";
import { store, persistReady, resetStore, setUser, selectUser } from "@/store";
import { loadGroups } from "@/store/groups";

/** Prepare the store and fetcher. Load groups. */
export default async function loader() {
	await persistReady;

	let user: User;
	try {
		user = await getUserLocalStorage();
	} catch {
		return;
	}
	if (user) {
		if (!user.Token) throw new Error("No token");
		fetcher.setToken(user.Token); // Prime fetcher with autherization token

		const { dispatch, getState } = store;

		const storeUser = selectUser(getState());
		if (storeUser.SAPIN !== user.SAPIN) dispatch(resetStore());
		dispatch(setUser(user)); // Make sure we have the latest user info

		await dispatch(loadGroups());
	}
}
