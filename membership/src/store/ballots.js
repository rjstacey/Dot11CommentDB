import {createSlice, createSelector, createEntityAdapter} from '@reduxjs/toolkit'

import {displayDate} from 'dot11-components/lib/utils'
import fetcher from 'dot11-components/lib/fetcher'
import sortsSlice, {initSorts, SortDirection, SortType} from 'dot11-components/store/sort'
import filtersSlice, {initFilters, FilterType} from 'dot11-components/store/filters'
import selectedSlice, {setSelected} from 'dot11-components/store/selected'
import uiSlice from 'dot11-components/store/ui'
import {setError} from 'dot11-components/store/error'

export const BallotType = {
	CC: 0,			// comment collection
	WG_Initial: 1,	// initial WG ballot
	WG_Recirc: 2,	// WG ballot recirculation
	SA_Initial: 3,	// initial SA ballot
	SA_Recirc: 4,	// SA ballot recirculation
	Motion: 5		// motion
};

export const fields = {
	Project: {label: 'Project'},
	BallotID: {label: 'Ballot'},
	Document: {label: 'Document'},
	Topic: {label: 'Topic'},
	EpollNum: {label: 'ePoll', sortType: SortType.NUMERIC},
	Start: {label: 'Start', dataRenderer: displayDate, sortType: SortType.DATE},
	End: {label: 'End', dataRenderer: displayDate, sortType: SortType.DATE},
	Results: {label: 'Results'},
	Comments: {label: 'Comments'},
	VotingPoolID: {label: 'VotingPoolID'},
	PrevBallotID: {label: 'PrevBallotID'}
};

/*
 * Generate a filter for each field (table column)
 */
const defaultFiltersEntries = Object.keys(fields).reduce((entries, dataKey) => {
	if (dataKey === 'Comments' || dataKey === 'Result')
		return entries;
	return {...entries, [dataKey]: {}};
}, {});

/*
 * Generate object that describes the initial sort state
 */
const defaultSortEntries = Object.keys(fields).reduce((entries, dataKey) => {
	if (dataKey === 'Comments' || dataKey === 'Result')
		return entries;
	let type = SortType.STRING;
	switch (dataKey) {
		case 'EpollNum':
			type = SortType.NUMERIC
			break
		case 'Start':
		case 'End':
			type = SortType.DATE
			break
		case 'Project':
		case 'BallotID':
		case 'Document':
		case 'Topic':
		case 'PrevBallotID':
		case 'VotingPoolID':
		default:
			type = SortType.STRING
			break
	}
	const direction = SortDirection.NONE;
	return {...entries, [dataKey]: {type, direction}};
}, {});

function getProjectForBallotId(state, ballotId) {
	const id = state.ids.find(id => state.entities[id].BallotID === ballotId)
	return id? state.entities[id].Project: ''
}

/*
 * Remove entries that no longer exist from a list. If there
 * are no changes, return the original list.
 */
function filterIdList(idList, allIds) {
	const newList = idList.filter(id => allIds.includes(id));
	return newList.length === idList.length? idList: newList;
}

const dataAdapter = createEntityAdapter({
	selectId: (b) => b.id,
	sortComparer: (b1, b2) => b1.Project === b2.Project? b1.BallotID.localeCompare(b2.BallotID): b1.Project.localeCompare(b2.Project) 
})

const dataSet = 'ballots';

const slice = createSlice({
	name: dataSet,
	initialState: dataAdapter.getInitialState({
		valid: false,
		loading: false,
		project: '',
		ballotId: '',
		[sortsSlice.name]: sortsSlice.reducer(undefined, initSorts(fields)),
		[filtersSlice.name]: filtersSlice.reducer(undefined, initFilters(fields)),
		[selectedSlice.name]: selectedSlice.reducer(undefined, {}),
		[uiSlice.name]: uiSlice.reducer(undefined, {})
	}),
	reducers: {
		getPending(state, action) {
			state.loading = true;
		},
  		getSuccess(state, action) {
  			const {ballots} = action.payload;
			state.loading = false;
			state.valid = true;
			dataAdapter.setAll(state, ballots);
			state.project = getProjectForBallotId(state, state.ballotId);
			state[selectedSlice.name] = filterIdList(state[selectedSlice.name], state.ids);
		},
		getFailure(state, action) {
			state.loading = false;
		},
		addOne(state, action) {
			const {ballot} = action.payload;
			dataAdapter.addOne(state, ballot);
		},
		updateOne(state, action) {
			const {id, changes} = action.payload;
			dataAdapter.updateOne(state, {id, changes});
			state[selectedSlice.name] = filterIdList(state[selectedSlice.name], state.ids);
		},
		deleteMany(state, action) {
			dataAdapter.removeMany(state, action.payload);
			state[selectedSlice.name] = filterIdList(state[selectedSlice.name], state.ids);
		},
		setProject(state, action) {
			const project = action.payload;
			if (getProjectForBallotId(state, state.ballotId) !== project)
				state.ballotId = '';
			state.project = project;
		},
		setBallotId(state, action) {
			const ballotId = action.payload;
			state.ballotId = ballotId;
			state.project = getProjectForBallotId(state, ballotId);
		}
	},
	extraReducers: builder => {
		builder
		.addMatcher(
			(action) => action.type.startsWith(dataSet + '/'),
			(state, action) => {
				const sliceAction = {...action, type: action.type.replace(dataSet + '/', '')}
				state[sortsSlice.name] = sortsSlice.reducer(state[sortsSlice.name], sliceAction);
				state[filtersSlice.name] = filtersSlice.reducer(state[filtersSlice.name], sliceAction);
				state[selectedSlice.name] = selectedSlice.reducer(state[selectedSlice.name], sliceAction);
				state[uiSlice.name] = uiSlice.reducer(state[uiSlice.name], sliceAction);
			}
		)
	}
});

/*
 * Export reducer as default
 */
export default slice.reducer;

/*
 * Actions
 */
export const {setProject, setBallotId} = slice.actions;

const {getPending, getSuccess, getFailure} = slice.actions;

export const loadBallots = () => 
	async (dispatch, getState) => {
		if (getState()[dataSet].loading)
			return;
		dispatch(getPending());
		let response;
		try {
			response = await fetcher.get('/api/ballots');
		}
		catch(error) {
			console.log(error)
			await Promise.all([
				dispatch(getFailure()),
				dispatch(setError('Unable to get ballot list', error.toString()))
			]);
			return;
		}
		await dispatch(getSuccess({ballots: response}));
	}

const {updateOne} = slice.actions;
export const updateBallotSuccess = (id, changes) => updateOne({id, changes});

export const updateBallot = (ballotId, ballot) =>
	async (dispatch, getState) => {
		const url = '/api/ballots';
		let response;
		try {
			response = await fetcher.patch(url, [ballot]);
			if (!Array.isArray(response))
				throw new TypeError('Unexpected response to PATCH ' + url);
		}
		catch(error) {
			await dispatch(setError(`Unable to update ballot ${ballotId}`, error.toString()));
			return;
		}
		const [updatedBallot] = response;
		await dispatch(updateOne({id: ballot.id, changes: updatedBallot}))
	}

const {deleteMany} = slice.actions;

export const deleteBallots = (ballots) =>
	async (dispatch, getState) => {
		const ids = ballots.map(b => b.id);
		try {
			await fetcher.delete('/api/ballots', ids);
		}
		catch(error) {
			const ballotIdsStr = ballots.map(b => ballots.BallotID).join(', ');
			await dispatch(setError(`Unable to delete ballots ${ballotIdsStr}`, error.toString()));
			return;
		}
		await dispatch(deleteMany(ids));
	}

const {addOne} = slice.actions;

export const addBallot = (ballot) =>
	async (dispatch, getState) => {
		let response;
		try {
			response = await fetcher.post('/api/ballots', [ballot])
		}
		catch(error) {
			await dispatch(setError(`Unable to add ballot ${ballot.BallotID}`, error.toString()));
			return;
		}
		const [updatedBallot] = response;
		await dispatch(addOne({ballot: updatedBallot}))
	}

/*
 * Selectors
 */
const getBallots = (state) => state[dataSet].ids.map(id => state[dataSet].entities[id]);
const getProject = (state) => state[dataSet].project;

/* Generate project list from the ballot pool */
export const getProjectList = createSelector(
	getBallots,
	(ballots) => [...new Set(ballots.map(b => b.Project))].sort()
);

/* Generate ballot list from the ballot pool */
export const getBallotList = createSelector(
	getBallots,
	getProject,
	(ballots, project) => {
		const compare = (a, b) => {
			const A = a.label.toUpperCase()
			const B = b.label.toUpperCase()
			return A < B? -1: (A > B? 1: 0)
		}
		return ballots.filter(b => b.Project === project)
			.map(b => ({value: b.BallotID, label: `${b.BallotID} ${b.Document}`}))
			.sort(compare)
	}
);
