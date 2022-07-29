import {createSelector} from '@reduxjs/toolkit';
import { v4 as uuid } from 'uuid';
import {fetcher} from 'dot11-components/lib';
import {createAppTableDataSlice, SortType} from 'dot11-components/store/appTableData';
import {setError} from 'dot11-components/store/error';
import {upsertVotingPool} from './votingPools';
import {dataSet as membersDataSet} from './members';

export const dataSet = 'voters';

export const excusedOptions = [
	{value: 0, label: 'No'},
	{value: 1, label: 'Yes'}
];

const renderExcused = value => {
	const o = excusedOptions.find(o => o.value === value);
	return o? o.label: value;
}

export const fields = {
	SAPIN: {label: 'SA PIN', sortType: SortType.NUMERIC},
	Email: {label: 'Email'},
	Name: {label: 'Name'},
	Status: {label: 'Status'},
	Excused: {label: 'Excused', options: excusedOptions, dataRenderer: renderExcused}
};

/* Entities selector with join on members to get Name, Affiliation and Email.
 * If the member entry is obsolete find the member entry that replaces it. */
const selectEntities = createSelector(
	state => state[membersDataSet].entities,
	state => state[dataSet].entities,
	(members, voters) => {
		const entities = {};
		for (const [id, voter] of Object.entries(voters)) {
			let member = members[voter.SAPIN];
			while (member && member.Status === 'Obsolete') {
				member = members[member.ReplacedBySAPIN]
			}
			entities[id] = {
				...voter,
				Name: (member && member.Name) || '',
				Affiliation: (member && member.Affiliation) || '',
				Email: (member && member.Email)
			};
		}
		return entities;
	}
);

const sortComparer = (v1, v2) => v1.SAPIN - v2.SAPIN;

const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	sortComparer,
	selectEntities,
	initialState: {
		votingPoolId: '',
	},
	reducers: {
		setVotingPoolID(state, action) {
			state.votingPoolId = action.payload;
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
 * Selectors
 */
export const selectVotersState = (state) => state[dataSet];
const selectVotersCount = (state) => state[dataSet].ids.length;

/*
 * Actions
 */
const {
	setVotingPoolID,
	getPending,
	getSuccess,
	getFailure,
	removeMany,
	addOne,
	updateOne
} = slice.actions;

const baseUrl = '/api/voters';

export const loadVoters = (votingPoolId) =>
	async (dispatch, getState) => {
		if (selectVotersState(getState()).loading)
			return;
		dispatch(getPending());
		dispatch(setVotingPoolID(votingPoolId));
		const url = `${baseUrl}/${votingPoolId}`;
		let response;
		try {
			response = await fetcher.get(url);
			if (typeof response !== 'object' || !response.hasOwnProperty('voters'))
				throw new TypeError(`Unexpected response to GET: ${url}`);
		}
		catch(error) {
			await Promise.all([
				dispatch(getFailure()),
				dispatch(setError(`Unable to get voters for ${votingPoolId}`, error))
			]);
			return;
		}
		await dispatch(getSuccess(response.voters));
	}

export const deleteVoters = (votingPoolId, ids) =>
	async (dispatch, getState) => {
		dispatch(removeMany(ids));
		const count = selectVotersCount(getState());
		dispatch(upsertVotingPool({VotingPoolID: votingPoolId, VoterCount: count}));
		const url = `${baseUrl}/${votingPoolId}`;
		try {
			await fetcher.delete(url, ids);
		}
		catch(error) {
			await dispatch(setError(`Unable to delete voters in voting pool ${votingPoolId}`, error));
			return;
		}
	}

export const votersFromSpreadsheet = (votingPoolId, file) =>
	async (dispatch) => {
		dispatch(getPending());
		dispatch(setVotingPoolID(votingPoolId));
		const url = `${baseUrl}/${votingPoolId}/upload`;
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
		dispatch(setVotingPoolID(votingPoolId));
		const url = `${baseUrl}/${votingPoolId}/membersSnapshot`;
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
	async (dispatch, getState) => {
		voter = {id: uuid(), Excused: 0, ...voter};
		dispatch(addOne(voter));
		const count = selectVotersCount(getState());
		dispatch(upsertVotingPool({VotingPoolID: votingPoolId, VoterCount: count}));

		const url = `${baseUrl}/${votingPoolId}`;
		try {
			await fetcher.post(url, [voter]);
		}
		catch(error) {
			await dispatch(setError('Unable to add voter', error));
			return;
		}
	}

export const updateVoter = (id, changes) =>
	async (dispatch) => {
		dispatch(updateOne({id, changes}));
		try {
			await fetcher.patch(baseUrl, [{id, changes}]);
		}
		catch(error) {
			await dispatch(setError('Unable to update voter', error));
			return;
		}
	}

export const exportVoters = (votingPoolId) =>
	async (dispatch) => {
		const url = `${baseUrl}/${votingPoolId}/export`;
		try {
			await fetcher.getFile(url);
		}
		catch(error) {
			await dispatch(setError('Unable to export voters', error));
			return;
		}
	}
