import {createSlice, createSelector, createEntityAdapter} from '@reduxjs/toolkit'
import fetcher from 'dot11-components/lib/fetcher';
import {createAppTableDataSlice, SortType} from 'dot11-components/store/appTableData';
import {setError} from 'dot11-components/store/error'
import {displayDate} from 'dot11-components/lib'

export const fields = {
	EpollNum: {label: 'ePoll', isId: true, sortType: SortType.NUMERIC},
	BallotID: {label: 'BallotID'},
	Start: {label: 'Start', dataRenderer: displayDate, sortType: SortType.DATE},
	End: {label: 'End', dataRenderer: displayDate, sortType: SortType.DATE},
	Document: {label: 'Document'},
	Topic: {label: 'Topic'},
	Votes: {label: 'Result', sortType: SortType.NUMERIC}
};

const dataSet = 'epolls';

const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	initialState: {},
	selectId: d => d.EpollNum
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

/*
 * Selectors
 */
const getBallots = (state) => state.ballots.ids.map(id => state.ballots.entities[id]);
const getEpollsData = (state) => state.epolls.ids.map(id => state.epolls.entities[id]);

/*
 * Generate epolls list with indicator on each entry of presence in ballots list
 */
export const getSyncedEpolls = createSelector(
	getBallots,
	getEpollsData,
	(ballots, epolls) => (
		epolls.map(d => {
			if (ballots.find(b => b.EpollNum === d.EpollNum))
				return d.InDatabase? d: {...d, InDatabase: true}
			else
				return d.InDatabase? {...d, InDatabase: false}: d
		})
	)
);

/*
 * Selectors
 */
const getBallotsEntities = (state) => state['ballots'].entities;
const getEpollsEntities = (state) => state[dataSet].entities;

/*
 * getSyncedEpollEntities(state)
 *
 * Generate epoll entities objectwith indicator on each entry of presence in ballots list
 */
export const getSyncedEpollEntities = createSelector(
	getBallotsEntities,
	getEpollsEntities,
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