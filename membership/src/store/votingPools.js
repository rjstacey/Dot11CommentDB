import fetcher from 'dot11-components/lib/fetcher';
import {createAppTableDataSlice, SortType} from 'dot11-components/store/appTableData';
import {setError} from 'dot11-components/store/error';

export const fields = {
	VotingPoolID: {label: 'VotingPoolID'},
	VoterCount: {label: 'VoterCount'}
};

const dataSet = 'votingPools';
const selectId = vp => vp.VotingPoolID;
const sortComparer = (vp1, vp2) => vp1.VotingPoolID.localeCompare(vp2.VotingPoolID);

const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	selectId,
	sortComparer,
	initialState: {},
	extraReducers: (builder, dataAdapter) => {
		builder
		.addMatcher(
			(action) => action.type === 'voters/setVotingPool',
			(state, action) => {
				const votingPool = action.payload;
				dataAdapter.upsertOne(state, votingPool);
			}
		);
	}
});

/*
 * Export reducer as default
 */
export default slice.reducer;

const {
	getPending,
	getSuccess,
	getFailure,
	removeMany,
	updateOne,
	upsertOne
} = slice.actions;

export const loadVotingPools = () =>
	async (dispatch, getState) => {
		if (getState()[dataSet].loading)
			return;
		dispatch(getPending());
		const url = '/api/votingPools';
		let response;
		try {
			response = await fetcher.get(url);
			if (typeof response !== 'object' || !response.hasOwnProperty('votingPools'))
				throw new TypeError(`Unexpected response to GET: ${url}`);
		}
		catch(error) {
			console.log(error)
			await Promise.all([
				dispatch(getFailure()),
				dispatch(setError('Unable to get voting pool list', error))
			]);
			return;
		}
		await dispatch(getSuccess(response.votingPools));
	}

export const deleteVotingPools = (votingPools) =>
	async (dispatch, getState) => {
		const votingPoolIds = votingPools.map(vp => vp.VotingPoolID);
		try {
			await fetcher.delete('/api/votingPools', votingPoolIds);
		}
		catch(error) {
			await dispatch(setError('Unable to delete voting pool(s)', error));
			return;
		}
		await dispatch(removeMany(votingPoolIds));
	}

export const updateVotingPool = (votingPoolId, votingPool) =>
	async (dispatch) => {
		const url = `/api/votingPools/${votingPoolId}`;
		let response;
		try {
			response = await fetcher.patch(url, votingPool);
			if (typeof response !== 'object' || !response.hasOwnProperty('votingPool'))
				throw new TypeError(`Unexpected response to GET: ${url}`);
		}
		catch(error) {
			await dispatch(setError('Unable to update voting pool', error));
			return;
		}
		await dispatch(updateOne({id: votingPoolId, changes: response.votingPool}));
	}

export {upsertOne as upsertVotingPool};
