import { createSelector } from '@reduxjs/toolkit';
import type { Dictionary } from '@reduxjs/toolkit';
import {
	fetcher,
	setError,
	createAppTableDataSlice, SortType,
	displayDate,
	getAppTableDataSelectors,
	isObject
} from 'dot11-components';

import { selectBallotEntities as selectSyncedBallotEntities } from './ballots';
import type { RootState, AppThunk } from '.';

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
	id: {label: 'ePoll', isId: true, sortType: SortType.NUMERIC},
	name: {label: 'Name'},
	start: {label: 'Start', dataRenderer: displayDate, sortType: SortType.DATE},
	end: {label: 'End', dataRenderer: displayDate, sortType: SortType.DATE},
	document: {label: 'Document'},
	topic: {label: 'Topic'},
	resultsSummary: {label: 'Result', sortType: SortType.NUMERIC}
};

export const dataSet = 'epolls';

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

const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	initialState: {},
	selectId: (d: Epoll) => d.id,
	reducers: {}
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
	async (dispatch) => {
		if (loadPromise)
			return loadPromise;
		dispatch(getPending());
		loadPromise = (fetcher.get('/api/epolls', {n}) as Promise<Epoll[]>)
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
