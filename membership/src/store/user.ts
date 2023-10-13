import { createSlice } from "@reduxjs/toolkit";
import type { RootState } from ".";
import { selectWorkingGroup } from "./groups";

export const AccessLevel = {
	none: 0,
	ro: 1,
	rw: 2,
	admin: 3,
};

export type User = {
	SAPIN: number;
	//Username: string;
	Name: string;
	Email: string;
	Status: string;
	Permissions: string[];
	Access: number;
	Token: any;
};

/** The `user` slice is readonly and contains user info */
const dataSet = "user";
export function createUserSlice(user: User) {
	return createSlice({
		name: dataSet,
		initialState: user,
		reducers: {},
	});
}

/*
 * Selectors
 */
export const selectUser = (state: RootState) => state[dataSet];

export const selectUserMembersAccess = (state: RootState) => {
	const user = selectUser(state);
	let access =
		selectWorkingGroup(state)?.permissions.members || AccessLevel.none;
	return Math.max(user.Access, access);
};
