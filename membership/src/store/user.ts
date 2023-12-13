import { createSlice, PayloadAction } from "@reduxjs/toolkit";
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

/*
 * Selectors
 */
export const selectUser = (state: RootState): User => {
	const user = state[dataSet];
	if ("SAPIN" in user) return user;
	throw Error("`user` slice not initialized");
};

export const selectUserMembersAccess = (state: RootState) => {
	const user = selectUser(state);
	let access =
		selectWorkingGroup(state)?.permissions.members || AccessLevel.none;
	return Math.max(user.Access, access);
};


/*
 * Actions
 */
const { initUser } = slice.actions;
export { initUser };
