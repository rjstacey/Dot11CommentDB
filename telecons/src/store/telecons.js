import fetcher from 'dot11-components/lib/fetcher';
import {createAppTableDataSlice, SortType} from 'dot11-components/store/appTableData';
import {setError} from 'dot11-components/store/error';
import {displayDate} from 'dot11-components/lib';

export const fields = {
	group: {label: 'Group'},
	subgroup: {label: 'Subgroup'},
	start: {label: 'Start', dataRenderer: displayDate, sortType: SortType.DATE},
	end: {label: 'End', dataRenderer: displayDate, sortType: SortType.DATE},
	hasMotions: {label: 'Motions'},
	webex_id: {label: 'Webex account'},
};

export const dataSet = 'telecons';

const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	initialState: {},
});

/*
 * Export reducer as default
 */
export default slice.reducer;

const {
	getPending,
	getSuccess,
	getFailure,
	updateMany,
	addMany,
	removeMany,
	setProperty,
	setSelected
} = slice.actions;

export {setProperty as setUiProperty, setSelected};

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
			await Promise.all([
				dispatch(getFailure()),
				dispatch(setError('Unable to get list of telecons', error))
			]);
			return;
		}
		await dispatch(getSuccess(telecons));
	}

export const updateTelecons = (updates) =>
	async (dispatch) => {
		await dispatch(updateMany(updates));
		const url = `/api/telecons`;
		let asUpdated;
		try {
			asUpdated = await fetcher.patch(url, updates);
			if (!Array.isArray(asUpdated))
				throw new TypeError('Unexpected response to PATCH: ' + url);
		}
		catch(error) {
			await dispatch(setError(`Unable to update telecons`, error));
			return;
		}
		await dispatch(updateMany(asUpdated));
	}

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

export const deleteTelecons = (ids) =>
	async (dispatch) => {
		try {
			await fetcher.delete('/api/telecons', ids);
		}
		catch(error) {
			await dispatch(setError(`Unable to delete telecons ${ids}`, error));
			return;
		}
		await dispatch(removeMany(ids));
	}

/*
 * Selectors
 */
export const getTeleconsForSubgroup = (state, subgroup) => state.ids.filter(id => state.entities[id].Subgroup === subgroup);
