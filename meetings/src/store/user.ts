import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '.';

export type User = {
	SAPIN: number;
	Username: string;
	Name: string;
	Email: string;
	Status: string;
	Access: number;
	Permissions: string[];
}

export const AccessLevel = {
	none: 0,
	ro: 1,
	rw: 2,
	admin: 3
};

export const dataSet = 'user';

const slice = createSlice({
	name: dataSet,
	initialState: null as User | null,
	reducers: {
		setUser(state, action: PayloadAction<User>) {
			return action.payload;
		},
	},
});

export default slice;

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

/*
 * Actions
 */
export const {setUser} = slice.actions;
