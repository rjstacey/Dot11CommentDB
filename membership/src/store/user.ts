import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import type {RootState} from '.';

export const AccessLevel = {
	none: 0,
	ro: 1,
	rw: 2,
	admin: 3
};

export const dataSet = 'user';

type User = {
	SAPIN: number;
	Username: string;
	Name: string;
	Email: string;
	Permissions: string[];
	Access: number;
};

const initialState: User | null = null as (User | null);

const slice = createSlice({
	name: dataSet,
	initialState,
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
export const selectUserPermissions = (state: RootState) => selectUser(state)?.Permissions || [];

export function selectUserMembershipAccess(state: RootState) {
	const permissions = selectUserPermissions(state);
	if (Array.isArray(permissions)) {
		if (permissions.includes('membership_rw'))
			return AccessLevel.rw;
		if (permissions.includes('membership_ro'))
			return AccessLevel.ro;
		if (permissions.includes('wgAdmin'))
			return AccessLevel.admin;
	}

	/* Eventually, this will be deprecated. Here until we fully transision to the permissions array. */
	return selectUser(state)?.Access || AccessLevel.none;
}

/*
 * Actions
 */
export const {setUser} = slice.actions;
