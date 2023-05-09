import { createSelector } from '@reduxjs/toolkit';
import { Dictionary } from '@reduxjs/toolkit';
import {
	fetcher,
	setError,
	createAppTableDataSlice, SortType,
	displayDate,
	getAppTableDataSelectors
} from 'dot11-components';

import {selectEntities as selectBallotsEntities} from './ballots';
import type { RootState, AppThunk } from '.';

export type Epoll = {
	BallotID: string;
	Start: string;
	End: string;
	Topic: string;
	Document: string;
	Votes: string;
	EpollNum: number;
}

export type SyncedEpoll = Epoll & {
	InDatabase: boolean;
}

export const fields = {
	EpollNum: {label: 'ePoll', isId: true, sortType: SortType.NUMERIC},
	BallotID: {label: 'BallotID'},
	Start: {label: 'Start', dataRenderer: displayDate, sortType: SortType.DATE},
	End: {label: 'End', dataRenderer: displayDate, sortType: SortType.DATE},
	Document: {label: 'Document'},
	Topic: {label: 'Topic'},
	Votes: {label: 'Result', sortType: SortType.NUMERIC}
};

export const dataSet = 'epolls';

/*
 * Selectors
 */
export const selectEpollsState = (state: RootState) => state[dataSet];

export const selectIds = (state: RootState) => state[dataSet].ids;
export const selectEntities = (state: RootState) => state[dataSet].entities;

/*
 * selectSyncedEntities(state)
 *
 * Generate epoll entities with indicator on each entry of presence in ballots list
 */
export const selectSyncedEntities = createSelector(
	selectBallotsEntities,
	selectEntities,
	(ballotEntities, epollEntities) => {
		const syncedEpollEntities: Dictionary<SyncedEpoll> = {};
		for (const id of Object.keys(epollEntities))
			syncedEpollEntities[id] = {...epollEntities[id]!, InDatabase: false};
		for (const b of Object.values(ballotEntities)) {
			if (b!.EpollNum && syncedEpollEntities[b!.EpollNum])
				syncedEpollEntities[b!.EpollNum]!.InDatabase = true;
		}
		return syncedEpollEntities;
	}
);

export const epollsSelectors = getAppTableDataSelectors(selectEpollsState, {selectEntities: selectSyncedEntities})

const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	initialState: {},
	selectId: (d: Epoll) => d.EpollNum,
	reducers: {}
});

export default slice;

/*
 * Actions
 */
export const epollsActions = slice.actions;

const {getPending, getSuccess, getFailure} = slice.actions;

export const loadEpolls = (n = 20): AppThunk =>
	async (dispatch) => {
		dispatch(getPending());
		let epolls;
		try {
			epolls = await fetcher.get('/api/epolls', {n});
			if (!Array.isArray(epolls))
				throw new TypeError("Unexpected response to GET: /api/epolls");
		}
		catch(error) {
			dispatch(getFailure());
			dispatch(setError('Unable to get a list of epolls', error));
			return;
		}
		dispatch(getSuccess(epolls));
	}
