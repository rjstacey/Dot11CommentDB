import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from ".";

export const AccessLevel = {
	none: 0,
	ro: 1,
	rw: 2,
	admin: 3,
};

export type User = {
	SAPIN: number;
	Name: string;
	Email: string;
	Token: any;
};

const initialState: User = {
	SAPIN: 0,
	Name: "",
	Email: "",
	Token: null,
};

const dataSet = "user";
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

/* Slice actions */
export const { setUser } = slice.actions;

/* Selectors */
export const selectUser = (state: RootState) => state[dataSet];
