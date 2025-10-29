import type { User } from "@schemas/user.js";
const LOGIN_STORAGE = "User";

export function setUserLocalStorage(user: User) {
	localStorage.setItem(LOGIN_STORAGE, JSON.stringify(user));
}

export function clearUserLocalStorage() {
	localStorage.removeItem(LOGIN_STORAGE);
}

export function getUserLocalStorage() {
	// Get user from local storage. This may fail if the browser has certain privacy settings.
	let user: User | undefined;
	try {
		const s = localStorage.getItem(LOGIN_STORAGE);
		if (s) user = JSON.parse(s);
	} catch (err) {
		/* ignore errors */
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
