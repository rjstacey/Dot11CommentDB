import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { User } from "@schemas/user.js";
export type { User };

const initialState: User = {
	SAPIN: 0,
	Name: "",
	Email: "",
	Token: null,
};

const dataSet = "user";
export const userSlice = createSlice({
	name: dataSet,
	initialState,
	reducers: {
		setUser(state, action: PayloadAction<User>) {
			return action.payload;
		},
	},
});

/* Slice actions */
export const { setUser } = userSlice.actions;

/* Selectors */
export const selectUser = (state: { [dataSet]: User }) => state[dataSet];
