import {createSlice} from '@reduxjs/toolkit';

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

/*
 * Actions
 */
export const {setUser} = slice.actions;
