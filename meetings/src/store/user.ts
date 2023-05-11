import { createSlice } from '@reduxjs/toolkit';
import type { RootState } from '.';

export const AccessLevel = {
	none: 0,
	ro: 1,
	rw: 2,
	admin: 3
};

export const dataSet = 'user';

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

/** The `user` slice is readonly and contains user info */
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
export const selectUserPermissions = (state: RootState) => selectUser(state)!.Permissions;

export function selectUserMeetingsAccess(state: RootState) {
	const permissions = selectUserPermissions(state);
	if (Array.isArray(permissions)) {
		if (permissions.includes('wg_admin'))
			return AccessLevel.admin;
		if (permissions.includes('meetings_rw'))
			return AccessLevel.rw;
		if (permissions.includes('meetings_ro'))
			return AccessLevel.ro;
	}
	return AccessLevel.none;
}
