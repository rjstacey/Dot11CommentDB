import {createSlice, createSelector, createEntityAdapter} from '@reduxjs/toolkit'

import {setError} from './error'
import fetcher from './fetcher'

import sortReducer, {sortInit, SortDirection, SortType} from './sort'
import filtersReducer, {filtersInit, FilterType} from './filters'
import selectedReducer, {setSelected} from './selected'
import uiReducer from './ui'

export const BallotType = {
	CC: 0,			// comment collection
	WG_Initial: 1,	// initial WG ballot
	WG_Recirc: 2,	// WG ballot recirculation
	SA_Initial: 3,	// initial SA ballot
	SA_Recirc: 4,	// SA ballot recirculation
	Motion: 5		// motion
};

const ballotFields = [
	'Project',
	'BallotID',
	'Document',
	'Topic',
	'EpollNum',
	'Start',
	'End',
	'Result',
	'Comments',
	'VotingPoolID',
	'PrevBallotID'
];

/*
 * Generate a filter for each field (table column)
 */
const defaultFiltersEntries = ballotFields.reduce((entries, dataKey) => {
	if (dataKey === 'Comments' || dataKey === 'Result')
		return entries;
	return {...entries, [dataKey]: {}};
}, {});

/*
 * Generate object that describes the initial sort state
 */
const defaultSortEntries = ballotFields.reduce((entries, dataKey) => {
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

function updateSelected(ballots, selected) {
	return selected.filter(s => ballots.find(b => b.BallotID === s))
}

const dataAdapter = createEntityAdapter({
	selectId: (b) => b.id,
	sortComparer: (b1, b2) => b1.Project === b2.Project? b1.BallotID.localeCompare(b2.BallotID): b1.Project.localeCompare(b2.Project) 
})

const dataSet = 'ballots';

const ballotsSlice = createSlice({
	name: dataSet,
	initialState: dataAdapter.getInitialState({
		valid: false,
		loading: false,
		project: '',
		ballotId: '',
		sort: sortReducer(undefined, sortInit(defaultSortEntries)),
		filters: filtersReducer(undefined, filtersInit(defaultFiltersEntries)),
		selected: selectedReducer(undefined, {}),
		ui: uiReducer(undefined, {})
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
		},
		deleteMany(state, action) {
			const {ballots} = action.payload;
			dataAdapter.removeMany(state, ballots);
			//state.ballots = state.ballots.filter(b1 => !ballots.find(b2 => b1.id === b2.id));
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
				state.sort = sortReducer(state.sort, sliceAction);
				state.filters = filtersReducer(state.filters, sliceAction);
				state.selected = selectedReducer(state.selected, sliceAction);
				state.ui = uiReducer(state.ui, sliceAction);
			}
		)
	}
});

/*
 * Export reducer as default
 */
export default ballotsSlice.reducer;

/*
 * Actions
 */
export const {setProject, setBallotId} = ballotsSlice.actions;

const {getPending, getSuccess, getFailure} = ballotsSlice.actions;

export function loadBallots() {
	return async (dispatch, getState) => {
		if (getState().ballots.loading)
			return null
		dispatch(getPending())
		let response;
		try {
			response = await fetcher.get('/api/ballots')
		}
		catch(error) {
			console.log(error)
			return Promise.all([
				dispatch(getFailure()),
				dispatch(setError('Unable to get ballot list', error.toString()))
			])
		}
		return dispatch(getSuccess({ballots: response}))
	}
}

const {updateOne} = ballotsSlice.actions;
export const updateBallotSuccess = (id, changes) => updateOne({id, changes});

export function updateBallot(ballotId, ballot) {
	return async (dispatch, getState) => {
		let response;
		try {
			response = await fetcher.put(`/api/ballots`, [ballot])
		}
		catch(error) {
			return dispatch(setError(`Unable to update ballot ${ballotId}`, error.toString()))
		}
		const [updatedBallot] = response;
		return dispatch(updateOne({id: ballot.id, changes: updatedBallot}))
	}
}

const {deleteMany} = ballotsSlice.actions;

export function deleteBallots(ballots) {
	return async (dispatch, getState) => {
		try {
			await fetcher.delete('/api/ballots', ballots)
		}
		catch(error) {
			const ballotIdsStr = ballots.map(b => ballots.BallotID).join(', ')
			return dispatch(setError(`Unable to delete ballots ${ballotIdsStr}`, error.toString()))
		}
		return dispatch(deleteMany({ballots}))
	}
}

const {addOne} = ballotsSlice.actions;

export function addBallot(ballot) {
	return async (dispatch, getState) => {
		let response;
		try {
			response = await fetcher.post('/api/ballots', [ballot])
		}
		catch(error) {
			return dispatch(setError(`Unable to add ballot ${ballot.BallotID}`, error.toString()))
		}
		const [updatedBallot] = response;
		return dispatch(addOne({ballot: updatedBallot}))
	}
}

/*
 * Selectors
 */
const getBallotsFromStore = (state) => state[dataSet].ids.map(id => state[dataSet].entities[id]);
const getProjectFromStore = (state) => state[dataSet].project;

/* Generate project list from the ballot pool */
export const getProjectList = createSelector(
	getBallotsFromStore,
	(ballots) => [...new Set(ballots.map(b => b.Project))].sort()
);

/* Generate ballot list from the ballot pool */
export const getBallotList = createSelector(
	getBallotsFromStore,
	getProjectFromStore,
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
