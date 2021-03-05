import {createSlice} from '@reduxjs/toolkit'

const sliceName = 'selected';

const selectedSlice = createSlice({
	name: sliceName,
	initialState: [],
	reducers: {
		set(state, action) {return action.ids},
		toggle(state, action) {
			for (let id of action.ids) {
				const i = state.indexOf(id)
				if (i >= 0)
					state.splice(i, 1);
				else
					state.push(id);
			}
		}
	}
})

/* Export reducer as default */
export default selectedSlice;

/* Export actions */
export const setSelected = (dataSet, ids) => ({type: dataSet + '/' + selectedSlice.name + '/set', ids})
export const toggleSelected = (dataSet, ids) => ({type: dataSet + '/' + selectedSlice.name + '/toggle', ids})

/*
 * Selectors
 */
export const getSelected = (state, dataSet) => state[dataSet][sliceName]
