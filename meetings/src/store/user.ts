import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from ".";

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
	Permissions: string[];
	Access: number;
	Status: string;
	Token: any;
};

const dataSet = "user";
const slice = createSlice({
	name: dataSet,
	initialState: {} as User | {},
	reducers: {
		initUser(state, action: PayloadAction<User>) {
			return action.payload;
		},
	},
});

export default slice;


/* Slice actions */
export const { initUser } = slice.actions;

/* Selectors */
export const selectUser = (state: RootState): User => {
	const user = state[dataSet];
	if ("SAPIN" in user) return user;
	throw Error("`user` slice not initialized");
};
/*
export const selectUserPermissions = (state: RootState) =>
	selectUser(state)!.Permissions;

export function selectUserMeetingsAccess(state: RootState) {
	const permissions = selectUserPermissions(state);
	if (Array.isArray(permissions)) {
		if (permissions.includes("wg_admin")) return AccessLevel.admin;
		if (permissions.includes("meetings_rw")) return AccessLevel.rw;
		if (permissions.includes("meetings_ro")) return AccessLevel.ro;
	}
	return AccessLevel.none;
}
*/
