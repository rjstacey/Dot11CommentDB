import {createSlice, createSelector, createEntityAdapter} from '@reduxjs/toolkit';
import {fetcher} from 'dot11-components/lib';
import {createAppTableDataSlice, SortType} from 'dot11-components/store/appTableData';
import {setError} from 'dot11-components/store/error';
import {displayDate} from 'dot11-components/lib';

import {selectEntities as selectBallotsEntities} from './ballots';

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
 export const getEpollsDataSet = (state) => state[dataSet];

export const selectIds = (state) => state[dataSet].ids;
export const selectEntities = (state) => state[dataSet].entities;

/*
 * selectSyncedEntities(state)
 *
 * Generate epoll entities with indicator on each entry of presence in ballots list
 */
export const selectSyncedEntities = createSelector(
	selectBallotsEntities,
	selectEntities,
	(ballotEntities, epollEntities) => {
		const syncedEpollEntities = {};
		for (const id of Object.keys(epollEntities))
			syncedEpollEntities[id] = {...epollEntities[id], InDatabase: false}
		for (const b of Object.values(ballotEntities)) {
			if (syncedEpollEntities[b.EpollNum])
				syncedEpollEntities[b.EpollNum].InDatabase = true
		}
		return syncedEpollEntities;
	}
);

const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	initialState: {},
	selectId: d => d.EpollNum,
	selectEntities: selectSyncedEntities
});

export default slice.reducer;

const {getPending, getSuccess, getFailure} = slice.actions;

export const loadEpolls = (n = 20) =>
	async (dispatch) => {
		dispatch(getPending());
		let epolls;
		try {
			epolls = await fetcher.get('/api/epolls', {n});
			if (!Array.isArray(epolls))
				throw new TypeError("Unexpected response to GET: /api/epolls");
		}
		catch(error) {
			await Promise.all([
				dispatch(getFailure()),
				dispatch(setError('Unable to get a list of epolls', error))
			]);
			return;
		}
		await dispatch(getSuccess(epolls));
	}
