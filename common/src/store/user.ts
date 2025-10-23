import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { User } from "../lib";

export type { User };

export const AccessLevel = {
	none: 0,
	ro: 1,
	rw: 2,
	admin: 3,
};

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
