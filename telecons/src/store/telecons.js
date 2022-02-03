import fetcher from 'dot11-components/lib/fetcher';
import {createAppTableDataSlice, SortType, selectCurrentPanelConfig, setPanelIsSplit} from 'dot11-components/store/appTableData';
import {setError} from 'dot11-components/store/error';
import {displayDate} from 'dot11-components/lib';
import {DateTime} from 'luxon';

export const fields = {
	group: {label: 'Group'},
	subgroup: {label: 'Subgroup'},
	start: {label: 'Start', dataRenderer: displayDate, sortType: SortType.DATE},
	end: {label: 'End', dataRenderer: displayDate, sortType: SortType.DATE},
	day: {label: 'Day'},
	date: {label: 'Date'},
	time: {label: 'Time'},
	duration: {label: 'Duration'},
	hasMotions: {label: 'Motions'},
	webex_id: {label: 'Webex account'},
};

export function getField(entity, key) {
	if (key === 'day')
		return DateTime.fromISO(entity.start, {zone: entity.timezone}).weekdayShort;
	else if (key === 'date')
		return DateTime.fromISO(entity.start, {zone: entity.timezone}).toFormat('yyyy LLL dd');
	else if (key === 'time')
		return DateTime.fromISO(entity.start, {zone: entity.timezone}).toFormat('HH:mm');
	else if (key === 'duration')
		return DateTime.fromISO(entity.end).diff(DateTime.fromISO(entity.start), 'hours').hours;
	return entity[key];
}

export const dataSet = 'telecons';

const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	selectField: getField,
	initialState: {},
});

/*
 * Reducer
 */
export default slice.reducer;

/*
 * Selectors
 */
export const selectTeleconsState = (state) => state[dataSet];
export const getTeleconsForSubgroup = (state, subgroup) => state.ids.filter(id => state.entities[id].Subgroup === subgroup);

export const selectTeleconsCurrentPanelConfig = (state) => selectCurrentPanelConfig(state, dataSet);

/*
 * Actions
 */
export const setTeleconsCurrentPanelIsSplit = (value) => setPanelIsSplit(dataSet, undefined, value);

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
			await dispatch(setError('Unable to add telecons:', error));
			return;
		}
		await dispatch(addMany(newTelecons));
		return newTelecons.map(e => e.id);
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

export const syncTeleconsWithWebex = (ids) =>
	async (dispatch) => {
		let telecons;
		try {
			telecons = await fetcher.patch('/api/telecons/syncWebex', ids);
			if (!Array.isArray(telecons))
				throw new TypeError('Unexpected response');
		}
		catch(error) {
			await dispatch(setError(`Unable to sync telecons ${ids}`, error));
			return;
		}
		const updates = telecons.map(t => ({id: t.id, changes: t}));
		await dispatch(updateMany(updates));
	}

export const syncTeleconsWithCalendar = (ids) =>
	async (dispatch) => {
		let telecons;
		try {
			telecons = await fetcher.patch('/api/telecons/syncCalendar', ids);
			if (!Array.isArray(telecons))
				throw new TypeError('Unexpected response');
		}
		catch(error) {
			await dispatch(setError(`Unable to sync telecons ${ids}`, error));
			return;
		}
		const updates = telecons.map(t => ({id: t.id, changes: t}));
		await dispatch(updateMany(updates));
	}

