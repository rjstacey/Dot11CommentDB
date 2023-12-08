import { createSelector, Dictionary } from '@reduxjs/toolkit';

import {
	fetcher,
	setError,
	displayDate,
	displayDateRange,
	createAppTableDataSlice,
	getAppTableDataSelectors,
	FieldType,
	isObject,
} from 'dot11-components';

import type { RootState, AppThunk } from '.';
import { selectWorkingGroupName } from './groups';
import { selectCurrentSession, selectSessionEntities } from './sessions';

export type ImatMeeting = {
	id: number;
	organizerId: string;
	organizerSymbol: string;
	organizerName: string;
	name: string;
	type: string;
	start: string;
	end: string;
	timezone: string;
}

export type SyncedImatMeeting = ImatMeeting & {
	sessionId: number | null;
}

export const fields = {
	id: {label: 'Meeting number', type: FieldType.NUMERIC},
	start: {label: 'Start', dataRenderer: displayDate},
	end: {label: 'End', dataRenderer: displayDate},
	dateRange: {label: 'Dates'},
	name: {label: 'Name'},
	type: {label: 'Type'/*, dataRenderer: displaySessionType, options: SessionTypeOptions*/},
	timezone: {label: 'Time zone'},
	sessionId: {label: 'Session'}
};


/*
 * Fields derived from other fields
 */
export function getField(entity: ImatMeeting, dataKey: string) {
	if (dataKey === 'dateRange')
		return displayDateRange(entity.start, entity.end);
	return entity[dataKey as keyof ImatMeeting];
}

export const dataSet = 'imatMeetings';
const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	initialState: {},
	reducers: {}
});

export default slice;

/*
 * Selectors
 */
export const selectImatMeetingsState = (state: RootState) => state[dataSet];
export const selectImatMeetingEntities = (state: RootState) => selectImatMeetingsState(state).entities;
export const selectImatMeetingIds = (state: RootState) => selectImatMeetingsState(state).ids;

export const selectSyncedImatMeetingEntities = createSelector(
	selectImatMeetingIds,
	selectImatMeetingEntities,
	selectSessionEntities,
	(imatMeetingIds, imatMeetingEntities, sessionEntities) => {
		const newEntities: Dictionary<SyncedImatMeeting> = {};
		const sessions = Object.values(sessionEntities);
		imatMeetingIds.forEach(id => {
			const session = sessions.find(s => s!.imatMeetingId === id);
			newEntities[id] = {
				...imatMeetingEntities[id]!,
				sessionId: session?.id || null
			}
		});
		return newEntities;
	}
);

export const selectCurrentImatMeeting = (state: RootState) => {
	const session = selectCurrentSession(state);
	const imatMeetingId = session?.imatMeetingId;
	return imatMeetingId? selectImatMeetingEntities(state)[imatMeetingId]: undefined;
}

export const selectImatMeeting = (state: RootState, imatMeetingId: number) => selectImatMeetingEntities(state)[imatMeetingId];

export const imatMeetingsSelectors = getAppTableDataSelectors(selectImatMeetingsState, {getField, selectEntities: selectSyncedImatMeetingEntities});

/*
 * Actions
 */
export const imatMeetingsActions = slice.actions;

const {
	getPending,
	getSuccess,
	getFailure,
	removeAll,
} = slice.actions;

function validImatMeeting(imatMeeting: any): imatMeeting is ImatMeeting {
	return isObject(imatMeeting) &&
		typeof imatMeeting.id === 'number' &&
		typeof imatMeeting.name === 'string' &&
		typeof imatMeeting.type === 'string' &&
		typeof imatMeeting.start === 'string' &&
		typeof imatMeeting.end === 'string' &&
		typeof imatMeeting.timezone === 'string';
}

function validGetResponse(response: any): response is ImatMeeting[] {
	return Array.isArray(response) && response.every(validImatMeeting);
}

let loadImatMeetingsPromise: Promise<ImatMeeting[]> | null = null;
export const loadImatMeetings = (): AppThunk<ImatMeeting[]> =>
	(dispatch, getState) => {
		if (loadImatMeetingsPromise)
			return loadImatMeetingsPromise;
		const groupName = selectWorkingGroupName(getState());
		const url = `/api/${groupName}/imat/meetings`;
		dispatch(getPending());
		loadImatMeetingsPromise = (fetcher.get(url) as Promise<ImatMeeting[]>)
			.then((response: any) => {
				loadImatMeetingsPromise = null;
				if (!validGetResponse(response))
					throw new TypeError('Unexpected response to GET');
				dispatch(getSuccess(response));
				return response;
			})
			.catch((error: any) => {
				loadImatMeetingsPromise = null;
				dispatch(getFailure());
				dispatch(setError('Unable to get meetings list', error));
				return [];
			});
		return loadImatMeetingsPromise;
	}

export const getImatMeetings = (): AppThunk<ImatMeeting[]> =>
	async (dispatch, getState) => {
		const {valid, loading, ids, entities} = selectImatMeetingsState(getState());
		if (!valid || loading)
			return dispatch(loadImatMeetings());
		return ids.map(id => entities[id]!);
	}

export const clearImatMeetings = (): AppThunk => async (dispatch) => {dispatch(removeAll())};
