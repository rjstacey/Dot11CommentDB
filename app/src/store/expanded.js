import {createSlice} from '@reduxjs/toolkit'

const sliceName = 'expanded';

const expandedSlice = createSlice({
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
});

/* Export reducer as default */
export default expandedSlice;

/* Export actions */
export const setExpanded = (dataSet, ids) => ({type: dataSet + '/' + expandedSlice.name + '/set', ids})
export const toggleExpanded = (dataSet, ids) => ({type: dataSet + '/' + expandedSlice.name + '/toggle', ids})

/*
 * Selectors
 */
export const getExpanded = (state, dataSet) => state[dataSet][sliceName]
 