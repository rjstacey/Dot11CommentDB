import {createSlice} from '@reduxjs/toolkit';

export const AccessLevel = {
	none: 0,
	ro: 1,
	rw: 2,
	admin: 3
};

export const dataSet = 'user';

const slice = createSlice({
	name: dataSet,
	initialState: {},
	reducers: {
		setUser(state, action) {
			return action.payload;
		},
	},
});

export default slice;

/*
 * Selectors
 */
export const selectUser = (state) => state[dataSet];
export const selectUserPermissions = (state) => selectUser(state).Permissions;

export function selectUserMembershipAccess(state) {
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
	const access = selectUser(state).Access;
	if (typeof access === 'number')
		return access;
	
	return AccessLevel.none;
}

/*
 * Actions
 */
export const {setUser} = slice.actions;
