import {createSlice} from '@reduxjs/toolkit'

import fetcher from './lib/fetcher'

const initialState = []

const errorSlice = createSlice({
	name: 'error',
	initialState: [],
	reducers: {
		setError: {
			reducer: (state, action) => {
				const {summary, error} = action.payload;
				const detail = 
					(typeof error === 'string')
						? error
						: error.hasOwnProperty('detail')
							? error.detail
							: error.toString();
				state.push({summary, detail})
			},
			prepare: (summary, error) => ({payload: {summary, error}})
		},
		clearError(state, action) {
			if (state.length)
				state.shift();
		}
	}
});

export const {setError, clearError} = errorSlice.actions;

export default errorSlice.reducer;
