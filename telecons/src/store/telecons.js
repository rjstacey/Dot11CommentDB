import {createSlice, createEntityAdapter} from '@reduxjs/toolkit'

import {displayDate} from 'dot11-components/lib'
import fetcher from 'dot11-components/lib/fetcher'
import sortsSlice, {initSorts, SortDirection, SortType} from 'dot11-components/store/sort'
import filtersSlice, {initFilters, FilterType} from 'dot11-components/store/filters'
import selectedSlice, {setSelected} from 'dot11-components/store/selected'
import expandedSlice, {setExpanded} from 'dot11-components/store/expanded'
import uiSlice from 'dot11-components/store/ui'
import {setError} from 'dot11-components/store/error'

export const fields = {
	Subgroup: {label: 'Subgroup', sortType: SortType.STRING},
	Start: {label: 'Date', dataRenderer: displayDate, sortType: SortType.DATE},
	Duration: {label: 'Duration'},
	HasMotions: {label: 'Motions'},
	webex_id: {label: 'Webex account'},
};

export const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const dataAdapter = createEntityAdapter({})

const dataSet = 'telecons'

function correctEntry(entry) {
	let e = entry;
	if (typeof e.Start === 'string')
		e = {...e, Start: new Date(e.Start)};
	return e;
}

const slice = createSlice({
	name: dataSet,
	initialState: dataAdapter.getInitialState({
		valid: false,
		loading: false,
		[sortsSlice.name]: sortsSlice.reducer(undefined, initSorts(fields)),
		[filtersSlice.name]: filtersSlice.reducer(undefined, initFilters(fields)),
		[selectedSlice.name]: selectedSlice.reducer(undefined, {}),
		[expandedSlice.name]: expandedSlice.reducer(undefined, {}),
		[uiSlice.name]: uiSlice.reducer(undefined, {})
	}),
	reducers: {
		getPending(state, action) {
			state.loading = true;
		},
  		getSuccess(state, action) {
			state.loading = false;
			state.valid = true;
			const entities = action.payload.map(correctEntry);
			dataAdapter.setAll(state, entities);
		},
		getFailure(state, action) {
			state.loading = false;
		},
		updateMany(state, action) {
			const updates = action.payload.map(u => ({id: u.id, changes: correctEntry(u)}));
			dataAdapter.updateMany(state, updates);
		},
		addMany(state, action) {
			const entities = action.payload.map(correctEntry);
			dataAdapter.addMany(state, entities);
		},
		removeMany(state, action) {
			dataAdapter.removeMany(state, action.payload);
		},
	},
	extraReducers: builder => {
		builder
		.addMatcher(
			(action) => action.type.startsWith(dataSet + '/'),
			(state, action) => {
				const sliceAction = {...action, type: action.type.replace(dataSet + '/', '')}
				state[sortsSlice.name] = sortsSlice.reducer(state[sortsSlice.name], sliceAction);
				state[filtersSlice.name] = filtersSlice.reducer(state[filtersSlice.name], sliceAction);
				state[selectedSlice.name] = selectedSlice.reducer(state[selectedSlice.name], sliceAction);
				state[expandedSlice.name] = expandedSlice.reducer(state[expandedSlice.name], sliceAction);
				state[uiSlice.name] = uiSlice.reducer(state[uiSlice.name], sliceAction);
			}
		)
	}
});

/*
 * Export reducer as default
 */
export default slice.reducer;

const {getPending, getSuccess, getFailure} = slice.actions;

export const loadTelecons = (group) => 
	async (dispatch, getState) => {
		dispatch(getPending());
		const url = '/api/telecons' + (group? `/${group}`: '');
		let telecons;
		try {
			telecons = await fetcher.get(url);
			if (!Array.isArray(telecons))
				throw new TypeError(`Unexpected response to GET ${url}`);
		}
		catch(error) {
			await dispatch(getFailure());
			await dispatch(setError('Unable to get list of telecons', error));
			return;
		}
		await dispatch(getSuccess(telecons));
	}

const {updateMany} = slice.actions;

export const updateTelecons = (changes) =>
	async (dispatch) => {
		await dispatch(updateMany(changes));
		const url = `/api/telecons`;
		let updates;
		try {
			updates = await fetcher.patch(url, changes);
			if (Array.isArray(updates))
				throw new TypeError('Unexpected response to PATCH: ' + url);
		}
		catch(error) {
			await dispatch(setError(`Unable to update telecons`, error));
			return;
		}
		await dispatch(updateMany(changes));
	}

const {addMany} = slice.actions;

export const addTelecons = (telecons) =>
	async (dispatch) => {
		let newTelecons;
		try {
			newTelecons = await fetcher.post('/api/telecons', telecons);
			if (!Array.isArray(newTelecons))
				throw new TypeError('Unexpected response to POST: /api/telecons');
		}
		catch(error) {
			await dispatch(setError('Unable to add telecons', error));
			return;
		}
		dispatch(addMany(newTelecons));
	}

const {removeMany} = slice.actions;

export const deleteTelecons = (ids) =>
	async (dispatch) => {
		await dispatch(removeMany(ids));
		try {
			await fetcher.delete('/api/telecons', ids);
		}
		catch(error) {
			await dispatch(setError(`Unable to delete telecons ${ids}`, error));
		}
	}

/*
 * Selectors
 */
export const getTeleconsForSubgroup = (state, subgroup) => state.ids.filter(id => state.entities[id].Subgroup === subgroup);
