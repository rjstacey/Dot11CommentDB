import fetcher from 'dot11-components/lib/fetcher';
import {createAppTableDataSlice, SortType} from 'dot11-components/store/appTableData';
import {setError} from 'dot11-components/store/error';
import {upsertVotingPool} from './votingPools';

export const fields = {
	SAPIN: {label: 'SA PIN', sortType: SortType.NUMERIC},
	Email: {label: 'Email'},
	Name: {label: 'Name'},
	LastName: {label: 'LastName'},
	FirstName: {label: 'FirstName'},
	MI: {label: 'MI'},
	Status: {label: 'Status'}
};

const dataSet = 'voters';
const sortComparer = (v1, v2) => v1.SAPIN - v2.SAPIN;

const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	sortComparer,
	initialState: {
		votingPool: {VotingPoolID: '', VotersCount: 0},
	},
	reducers: {
		setVotingPool(state, action) {
			state.votingPool = action.payload;
		},
	},
	extraReducers: (builder) => {
		builder
		.addMatcher(
			(action) => ['votingPools/upsertVotingPool', 'votingPools/updateVotingPool'].includes(action.type),
			(state, action) => {
				const votingPool = action.payload;
				if (state.votingPool.VotingPoolID === votingPool.VotingPoolID) {
					state.votingPool = {...state.votingPool, ...votingPool};
				}
			}
		);
	}
});

/*
 * Export reducer as default
 */
export default slice.reducer;

/*
 * Actions
 */
const {
	setVotingPool,
	getPending,
	getSuccess,
	getFailure,
	removeMany,
	addOne,
	updateOne
} = slice.actions;

export const loadVoters = (votingPoolId) =>
	async (dispatch, getState) => {
		if (getState()[dataSet].loading)
			return;
		dispatch(getPending());
		dispatch(setVotingPool({VotingPoolID: votingPoolId, VotersCount: 0}));
		const url = `/api/voters/${votingPoolId}`;
		let response;
		try {
			response = await fetcher.get(url);
			if (typeof response !== 'object' ||
				!response.hasOwnProperty('votingPool') ||
				!response.hasOwnProperty('voters'))
				throw new TypeError(`Unexpected response to GET: ${url}`);
		}
		catch(error) {
			await Promise.all([
				dispatch(getFailure()),
				dispatch(setError(`Unable to get voters for ${votingPoolId}`, error))
			]);
			return;
		}
		await Promise.all([
			dispatch(setVotingPool(response.votingPool)),
			dispatch(getSuccess(response.voters))
		]);
	}

export const deleteVoters = (votingPoolId, ids) =>
	async (dispatch) => {
		const url = `/api/voters/${votingPoolId}`;
		let response;
		try {
			response = await fetcher.delete(url, ids);
			if (typeof response !== 'object' ||
				!response.hasOwnProperty('votingPool'))
				throw new TypeError(`Unexpected response to DELETE: ${url}`);
		}
		catch(error) {
			await dispatch(setError(`Unable to delete voters in voting pool ${votingPoolId}`, error));
			return;
		}
		await Promise.all([
			dispatch(upsertVotingPool(response.votingPool)),
			dispatch(removeMany(ids))
		]);
	}

export const votersFromSpreadsheet = (votingPoolId, file) =>
	async (dispatch) => {
		dispatch(getPending());
		dispatch(setVotingPool({VotingPoolID: votingPoolId, VotersCount: 0}));
		const url = `/api/voters/${votingPoolId}/upload`;
		let response;
		try {
			response = await fetcher.postMultipart(url, {File: file});
			if (typeof response !== 'object' ||
				!response.hasOwnProperty('votingPool') ||
				!response.hasOwnProperty('voters'))
				throw new TypeError(`Unexpected response to POST: ${url}`);
		}
		catch(error) {
			await Promise.all([
				dispatch(getFailure()),
				dispatch(setError(`Unable to upload voters for voting pool ${votingPoolId}`, error))
			]);
			return;
		}
		await Promise.all([
			dispatch(upsertVotingPool(response.votingPool)),
			dispatch(getSuccess(response.voters))
		]);
	}

export const votersFromMembersSnapshot = (votingPoolId, date) =>
	async (dispatch) => {
		dispatch(getPending());
		dispatch(setVotingPool({VotingPoolID: votingPoolId, VotersCount: 0}));
		const url = `/api/voters/${votingPoolId}/membersSnapshot`;
		let response;
		try {
			response = await fetcher.post(url, {date});
			if (typeof response !== 'object' ||
				!response.hasOwnProperty('votingPool') ||
				!response.hasOwnProperty('voters'))
				throw new TypeError(`Unexpected response to POST: ${url}`);
		}
		catch(error) {
			await Promise.all([
				dispatch(getFailure()),
				dispatch(setError(`Unable to create voting pool ${votingPoolId}`, error))
			]);
			return;
		}
		await Promise.all([
			dispatch(upsertVotingPool(response.votingPool)),
			dispatch(getSuccess(response.voters))
		]);
	}

export const addVoter = (votingPoolId, voter) =>
	async (dispatch) => {
		const url = `/api/voters/${votingPoolId}`;
		let response;
		try {
			response = await fetcher.post(url, [voter]);
			if (typeof response !== 'object' ||
				!response.hasOwnProperty('votingPool') ||
				!response.hasOwnProperty('voters') || !Array.isArray(response.voters))
				throw new TypeError(`Unexpected response to POST: ${url}`);
		}
		catch(error) {
			await dispatch(setError('Unable to add voter', error));
			return;
		}
		await Promise.all([
			dispatch(upsertVotingPool(response.votingPool)),
			dispatch(addOne(response.voters[0]))
		]);
	}

export const updateVoter = (id, changes) =>
	async (dispatch) => {
		const url = `/api/voters`;
		try {
			const response = await fetcher.patch(url, [{id, changes}]);
			if (!Array.isArray(response) || response.length !== 1)
				throw new TypeError(`Unexpected response to PATCH: ${url}`);
			changes = response[0].changes;
		}
		catch(error) {
			await dispatch(setError('Unable to update voter', error));
			return;
		}
		await dispatch(updateOne({id, changes}));
	}

/*
 * Selectors
 */
export const getVotersDataSet = (state) => state[dataSet];
