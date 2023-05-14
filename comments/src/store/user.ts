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
export const selectUserPermissions = (state: RootState) => selectUser(state)?.Permissions || [];

export function selectUserAccessLevel(state: RootState) {
	const permissions = selectUserPermissions(state);
	if (Array.isArray(permissions)) {
		if (permissions.includes('wgAdmin'))
			return AccessLevel.admin;
		if (permissions.includes('comments_rw'))
			return AccessLevel.rw;
		if (permissions.includes('comments_ro'))
			return AccessLevel.ro;
	}

	/* This will be deprecated. Here until we fully transision to the permissions array. */
	return selectUser(state)?.Access || AccessLevel.none;
}
