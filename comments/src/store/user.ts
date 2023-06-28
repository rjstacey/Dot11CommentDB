import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState, AppThunk, resetStore } from '.';

export const AccessLevel = {
	none: 0,
	ro: 1,
	rw: 2,
	admin: 3
};

export type User = {
	SAPIN: number;
	Name: string;
	Email: string;
	Permissions: string[];
	Access: number;
	Status: string;
	Token: any;
};

const initialState: User = {
	SAPIN: 0,
	Name: '',
	Email: '',
	Permissions: [],
	Access: AccessLevel.none,
	Status: 'Non-Voter',
	Token: null
}

const dataSet = 'user';
const slice = createSlice({
	name: dataSet,
	initialState,
	reducers: {
		setUser(state, action: PayloadAction<User>) {
			return action.payload;
		}
	},
});

export default slice;

/*
 * Selectors
 */
export const selectUser = (state: RootState) => state[dataSet];

/*
 * Actions
 */
export const initUser = (user: User): AppThunk =>
	async (dispatch, getState) => {
		const currentUser = selectUser(getState())
		if (currentUser.SAPIN !== user.SAPIN)
			dispatch(resetStore());
		dispatch(slice.actions.setUser(user));
	}