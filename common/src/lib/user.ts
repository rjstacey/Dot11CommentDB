import type { User } from "@schemas/user.js";
const USER_STORAGE_ITEM = "User";

export function setUserLocalStorage(user: User) {
	localStorage.setItem(USER_STORAGE_ITEM, JSON.stringify(user));
}

export function clearUserLocalStorage() {
	localStorage.removeItem(USER_STORAGE_ITEM);
}

export function getUserLocalStorage() {
	// Get user from local storage. This may fail if the browser has certain privacy settings.
	let user: User | undefined;
	try {
		const s = localStorage.getItem(USER_STORAGE_ITEM);
		if (s) user = JSON.parse(s);
	} catch (error) {
		window.alert(error);
	}
	return user
		? Promise.resolve(user)
		: Promise.reject(new Error("User account info not available"));
}

export async function loginAndReturn() {
	try {
		clearUserLocalStorage();
	} catch (error) {}
	window.location.href = "/login?redirect=" + window.location.pathname;
	await new Promise((r) => setTimeout(r, 1000));
	throw new Error("redirect to login failed");
}

//export const logout = loginAndReturn;
