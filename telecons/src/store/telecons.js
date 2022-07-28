import {createSelector} from '@reduxjs/toolkit';
import fetcher from 'dot11-components/lib/fetcher';
import {createAppTableDataSlice, SortType, selectCurrentPanelConfig, setPanelIsSplit} from 'dot11-components/store/appTableData';
import {setError} from 'dot11-components/store/error';
import {displayDate} from 'dot11-components/lib';
import {DateTime} from 'luxon';

import {selectGroupEntities} from './groups';
import {selectWebexAccountEntities} from './webexAccounts';

export function displayMeetingNumber(meetingNumber) {
	const s = meetingNumber.toString();
	return s.substring(0,4) + ' ' + s.substring(4,7) + ' ' + s.substring(7);
}

export const fields = {
	group_id: {label: 'Group ID'},
	groupName: {label: 'Group'},
	start: {label: 'Start', dataRenderer: displayDate, sortType: SortType.DATE},
	end: {label: 'End', dataRenderer: displayDate, sortType: SortType.DATE},
	startTime: {label: 'Start time'},
	endTime: {label: 'End time'},
	day: {label: 'Day'},
	date: {label: 'Date'},
	dayDate: {label: 'Day/Date'},
	timeRange: {label: 'Time'},
	duration: {label: 'Duration'},
	hasMotions: {label: 'Motions'},
	isCancelled: {label: 'Cancelled'},
	webexAccountId: {label: 'Webex account'},
};

/*
 * Fields derived from other fields
 */
export function getField(entity, key) {
	if (key === 'day')
		return DateTime.fromISO(entity.start, {zone: entity.timezone}).weekdayShort;
	if (key === 'date')
		return DateTime.fromISO(entity.start, {zone: entity.timezone}).toFormat('dd LLL yyyy');
	if (key === 'dayDate')
		return DateTime.fromISO(entity.start, {zone: entity.timezone}).toFormat('EEE, dd LLL yyyy');
	if (key === 'startTime')
		return DateTime.fromISO(entity.start, {zone: entity.timezone}).toFormat('HH:mm');
	if (key === 'endTime')
		return DateTime.fromISO(entity.end, {zone: entity.timezone}).toFormat('HH:mm');
	if (key === 'timeRange')
		return DateTime.fromISO(entity.start, {zone: entity.timezone}).toFormat('HH:mm') + '-' +
			   DateTime.fromISO(entity.end, {zone: entity.timezone}).toFormat('HH:mm');
	if (key === 'duration')
		return DateTime.fromISO(entity.end).diff(DateTime.fromISO(entity.start), 'hours').hours;
	if (key === 'location')
		return entity.webexMeeting? `${entity.webexAccountName}: ${displayMeetingNumber(entity.webexMeeting.meetingNumber)}`: '';
	if (key === 'meetingNumber')
		return entity.webexMeeting? displayMeetingNumber(entity.webexMeeting.meetingNumber): '';
	if (!entity.hasOwnProperty(key))
		console.warn(dataSet + 'has not field ' + key);
	return entity[key];
}

export function summarizeTelecon(entity) {
	const date = getField(entity, 'date');
	const timeRange = getField(entity, 'timeRange');
	return `${date} ${timeRange} ${entity.summary}`;
}

export const dataSet = 'telecons';

/*
 * Selectors
 */
export const selectTeleconsState = (state) => state[dataSet];
export const selectTeleconEntities = state => selectTeleconsState(state).entities;

export const getTeleconsForSubgroup = (state, subgroup) => state.ids.filter(id => state.entities[id].Subgroup === subgroup);
export const selectTeleconsCurrentPanelConfig = (state) => selectCurrentPanelConfig(state, dataSet);

export const selectSyncedTeleconEntities = createSelector(
	selectGroupEntities,
	selectWebexAccountEntities,
	selectTeleconEntities,
	(groups, webexAccounts, telecons) => {
		const entities = {};
		for (const id of Object.keys(telecons)) {
			const telecon = telecons[id];
			const group = groups[telecon.group_id];
			const webexAccount = webexAccounts[telecon.webexAccountId];
			entities[id] = {
				...telecon,
				groupName: group? group.name: 'Unknown',
				webexAccountName: webexAccount? webexAccount.name: 'None'
			};
		}
		return entities;
	}
);

export const selectTeleconDefaults = state => {
	const telecons = selectTeleconsState(state);
	const groupId = telecons.groupId;
	const defaults = telecons.defaults[groupId] || {};
	return defaults;
}

const sortComparer = (a, b) => DateTime.fromISO(a.start).toMillis() - DateTime.fromISO(b.start).toMillis(); 

const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	selectField: getField,
	sortComparer,
	initialState: {groupId: null, defaults: {}},
	selectEntities: selectSyncedTeleconEntities,
	reducers: {
		setGroupId(state, action) {
			state.groupId = action.payload;
		},
		setDefaults(state, action) {
			const groupId = state.groupId;
			state.defaults[groupId] = action.payload;
		},
		clearDefaults(state, action) {
			const groupId = state.groupId;
			delete state.defaults[groupId];
		}
	},
});

/*
 * Reducer
 */
export default slice.reducer;


/*
 * Actions
 */
export const setTeleconsCurrentPanelIsSplit = (value) => setPanelIsSplit(dataSet, undefined, value);

const {
	setGroupId,
	setDefaults,
	clearDefaults,
	getPending,
	getSuccess,
	getFailure,
	updateMany,
	upsertMany,
	setMany,
	addMany,
	removeMany,
	removeAll,
	setProperty,
	setSelected
} = slice.actions;

export {setProperty as setUiProperty, setSelected, setGroupId, upsertMany as upsertTelecons};

export const setTeleconDefaults = setDefaults;
export const clearTeleconDefaults = clearDefaults;

const baseUrl = '/api/telecons';

export const loadTelecons = ({parent_id, ...params}) => 
	async (dispatch, getState) => {
		dispatch(setGroupId(parent_id));
		dispatch(getPending());
		const url = baseUrl + (parent_id? `/${parent_id}`: '');
		let telecons;
		try {
			telecons = await fetcher.get(url, params);
			if (!Array.isArray(telecons))
				throw new TypeError(`Unexpected response to GET ${url}`);
		}
		catch(error) {
			dispatch(getFailure());
			dispatch(setError('Unable to get list of telecons', error));
			return;
		}
		await dispatch(getSuccess(telecons));
	}

export const removeTelecons = () =>
	async (dispatch, getState) => {
		dispatch(removeAll());
		dispatch(setGroupId(0));
	}

export const updateTelecons = (updates) =>
	async (dispatch) => {
		//await dispatch(updateMany(updates));
		let telecons;
		try {
			telecons = await fetcher.patch(baseUrl, updates);
			if (!Array.isArray(telecons))
				throw new TypeError('Unexpected response to PATCH ' + baseUrl);
		}
		catch(error) {
			await dispatch(setError(`Unable to update telecons`, error));
			return;
		}
		await dispatch(setMany(telecons));
	}

export const addTelecons = (telecons) =>
	async (dispatch) => {
		let newTelecons;
		try {
			newTelecons = await fetcher.post(baseUrl, telecons);
			if (!Array.isArray(newTelecons))
				throw new TypeError('Unexpected response to POST ' + baseUrl);
		}
		catch(error) {
			await dispatch(setError('Unable to add telecons:', error));
			return [];
		}
		await dispatch(addMany(newTelecons));
		return newTelecons.map(e => e.id);
	}

export const deleteTelecons = (ids) =>
	async (dispatch) => {
		try {
			await fetcher.delete(baseUrl, ids);
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

