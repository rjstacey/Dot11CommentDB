import { createSelector, createAction } from '@reduxjs/toolkit';
import type { Dictionary, Action } from '@reduxjs/toolkit';
import {
	fetcher,
	setError,
	createAppTableDataSlice, FieldType,
	displayDate,
	getAppTableDataSelectors,
	isObject
} from 'dot11-components';

import type { RootState, AppThunk } from '.';
import { selectBallotEntities as selectSyncedBallotEntities } from './ballots';
import { selectWorkingGroupName } from './groups';

export type Epoll = {
	id: number;
	name: string;
	start: string;
	end: string;
	topic: string;
	document: string;
	resultsSummary: string;
}

export type SyncedEpoll = Epoll & {InDatabase: boolean};

export const fields = {
	id: {label: 'ePoll', isId: true, type: FieldType.NUMERIC},
	name: {label: 'Name'},
	start: {label: 'Start', dataRenderer: displayDate, type: FieldType.DATE},
	end: {label: 'End', dataRenderer: displayDate, type: FieldType.DATE},
	document: {label: 'Document'},
	topic: {label: 'Topic'},
	resultsSummary: {label: 'Result', type: FieldType.NUMERIC}
};


/*
 * Selectors
 */
export const selectEpollsState = (state: RootState) => state[dataSet];
export const selectEpollIds = (state: RootState) => selectEpollsState(state).ids;
export const selectEpollEntities = (state: RootState) => selectEpollsState(state).entities;

/*
 * selectSyncedEntities(state)
 *
 * Generate epoll entities with indicator on each entry of presence in ballots list
 */
export const selectSyncedEntities = createSelector(
	selectSyncedBallotEntities,
	selectEpollEntities,
	(ballotEntities, epollEntities) => {
		const syncedEntities: Dictionary<SyncedEpoll> = {};
		for (const id of Object.keys(epollEntities))
			syncedEntities[id] = {...epollEntities[id]!, InDatabase: false};
		for (const b of Object.values(ballotEntities)) {
			if (b!.EpollNum && syncedEntities[b!.EpollNum])
				syncedEntities[b!.EpollNum]!.InDatabase = true;
		}
		return syncedEntities;
	}
);

export const epollsSelectors = getAppTableDataSelectors(selectEpollsState, {selectEntities: selectSyncedEntities})

const dataSet = 'epolls';

const clear = createAction(dataSet + '/clear');

const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	initialState: {},
	selectId: (d: Epoll) => d.id,
	reducers: {},
	extraReducers: (builder, dataAdapter) => {
		builder
			.addMatcher(
				(action: Action) => action.type === clear.toString(),
				(state) => {
					dataAdapter.removeAll(state);
					state.valid = false;
				}
			)
	}
});

export default slice;

/*
 * Actions
 */
export const epollsActions = slice.actions;

const {getPending, getSuccess, getFailure} = slice.actions;

function validEpoll(epoll: any): epoll is Epoll {
	return isObject(epoll) &&
		typeof epoll.id === 'number' &&
		typeof epoll.name === 'string' &&
		typeof epoll.start === 'string' &&
		typeof epoll.end === 'string' &&
		typeof epoll.topic === 'string' &&
		typeof epoll.document === 'string';
}

function validResponse(response: any): response is Epoll[] {
	return Array.isArray(response) && response.every(validEpoll);
}

let loadPromise: Promise<Epoll[]> | null;
export const loadEpolls = (n = 20): AppThunk<Epoll[]> =>
	async (dispatch, getState) => {
		if (loadPromise)
			return loadPromise;
		dispatch(getPending());
		const groupName = selectWorkingGroupName(getState());
		const url = `/api/${groupName}/epolls`;
		loadPromise = (fetcher.get(url, {n}) as Promise<Epoll[]>)
			.then((response: any) => {
				if (!validResponse(response))
					throw new TypeError("Unexpected response");
				dispatch(getSuccess(response));
				return response;
			})
			.catch((error: any) => {
				dispatch(getFailure());
				dispatch(setError('Unable to get a list of epolls', error));
				return [];
			})
			.finally(() => {
				loadPromise = null;
			});
		return loadPromise;
	}

export const getEpolls = (): AppThunk<Epoll[]> => 
	async (dispatch, getState) => {
		const {valid, loading, ids, entities} = selectEpollsState(getState());
		console.log(valid, loading)
		if (!valid || loading)
			return dispatch(loadEpolls());
		return ids.map(id => entities[id]!);
	}

export const clearEpolls = (): AppThunk =>
	async (dispatch) => {
		dispatch(clear())
	}