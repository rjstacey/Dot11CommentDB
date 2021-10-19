import {createSlice, createSelector, createEntityAdapter} from '@reduxjs/toolkit'

import {displayDate} from 'dot11-components/lib'
import fetcher from 'dot11-components/lib/fetcher'
import {createAppTableDataSlice, SortType} from 'dot11-components/store/appTableData'
import {setError} from 'dot11-components/store/error'

export const BallotType = {
	CC: 0,			// comment collection
	WG: 1,			// WG ballot
	SA: 2,			// SA ballot
	Motion: 3		// motion
};

export const BallotTypeLabels = {
	[BallotType.CC]: 'Comment collection',
	[BallotType.WG]: 'WG ballot',
	[BallotType.SA]: 'SA ballot',
	[BallotType.Motion]: 'Motion',
};

export const BallotTypeOptions = Object.values(BallotType).map(v => ({value: v, label: BallotTypeLabels[v]}));
export const renderBallotType = (type) => BallotTypeLabels[type] || 'Unknown';

export const BallotStage = {
	Initial: 0,
	Recirc: 1
};

export const BallotStageLabels = {
	[BallotStage.Initial]: 'Initial',
	[BallotStage.Recirc]: 'Recirc',
};

export const BallotStageOptions = Object.values(BallotStage).map(v => ({value: v, label: BallotStageLabels[v]}));
export const renderBallotStage = v => BallotStageLabels[v] || 'Unknown';

export const fields = {
	Project: {label: 'Project'},
	BallotID: {label: 'Ballot'},
	Type: {label: 'Type', sortType: SortType.NUMERIC, options: BallotTypeOptions, dataRenderer: renderBallotType},
	IsRecirc: {label: 'Stage', sortType: SortType.NUMERIC, options: BallotStageOptions, dataRenderer: renderBallotStage},
	IsComplete: {label: 'Final', sortType: SortType.NUMERIC},
	Document: {label: 'Document'},
	Topic: {label: 'Topic'},
	EpollNum: {label: 'ePoll', sortType: SortType.NUMERIC},
	Start: {label: 'Start', dataRenderer: displayDate, sortType: SortType.DATE},
	End: {label: 'End', dataRenderer: displayDate, sortType: SortType.DATE},
	Results: {label: 'Results', dontFilter: true, dontSort: true},
	Comments: {label: 'Comments', dontFilter: true, dontSort: true},
	VotingPoolID: {label: 'Voting pool'},
	PrevBallotID: {label: 'Prev ballot'}
};

function getProjectForBallotId(state, ballotId) {
	const id = state.ids.find(id => state.entities[id].BallotID === ballotId)
	return id? state.entities[id].Project: ''
}

const dataSet = 'ballots';

const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	sortComparer: (b1, b2) => b1.Project === b2.Project? b1.BallotID.localeCompare(b2.BallotID): b1.Project.localeCompare(b2.Project),
	initialState: {
		project: '',
		ballotId: '',
	},
	reducers: {
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
			(action) => action.type === dataSet + '/getSuccess',
			(state, action) => {
				state.project = getProjectForBallotId(state, state.ballotId);
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
			if (!Array.isArray(response))
				throw new TypeError("Unexpected response to GET: /api/ballots")
		}
		catch(error) {
			await dispatch(getFailure());
			await dispatch(setError('Unable to get ballot list', error));
			return;
		}
		await dispatch(getSuccess(response));
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
			await dispatch(setError(`Unable to update ballot ${ballotId}`, error));
			return;
		}
		const [updatedBallot] = response;
		await dispatch(updateOne({id: ballot.id, changes: updatedBallot}))
	}

const {removeMany} = slice.actions;

export const deleteBallots = (ballots) =>
	async (dispatch, getState) => {
		const ids = ballots.map(b => b.id);
		try {
			await fetcher.delete('/api/ballots', ids);
		}
		catch(error) {
			const ballotIdsStr = ballots.map(b => ballots.BallotID).join(', ');
			await dispatch(setError(`Unable to delete ballots ${ballotIdsStr}`, error));
			return;
		}
		await dispatch(removeMany(ids));
	}

const {addOne} = slice.actions;

export const addBallot = (ballot) =>
	async (dispatch, getState) => {
		let response;
		try {
			response = await fetcher.post('/api/ballots', [ballot]);
			if (!Array.isArray(response))
				throw new TypeError("Unexpected response to POST: /api/ballots");
		}
		catch(error) {
			await dispatch(setError(`Unable to add ballot ${ballot.BallotID}`, error));
			return;
		}
		const [updatedBallot] = response;
		await dispatch(addOne(updatedBallot));
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
