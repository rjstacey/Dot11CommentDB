import {createSelector} from '@reduxjs/toolkit';
import fetcher from 'dot11-components/lib/fetcher';
import {createAppTableDataSlice, SortType} from 'dot11-components/store/appTableData';
import {setError} from 'dot11-components/store/error';
import {displayDate} from 'dot11-components/lib';

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
const renderBallotType = (type) => BallotTypeLabels[type] || 'Unknown';

export const BallotStage = {
	Initial: 0,
	Recirc: 1
};

export const BallotStageLabels = {
	[BallotStage.Initial]: 'Initial',
	[BallotStage.Recirc]: 'Recirc',
};

export const BallotStageOptions = Object.values(BallotStage).map(v => ({value: v, label: BallotStageLabels[v]}));
const renderBallotStage = v => BallotStageLabels[v] || 'Unknown';

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
	Results: {label: 'Results'},
	Comments: {label: 'Comments'},
	VotingPoolID: {label: 'Voting pool'},
	PrevBallotID: {label: 'Prev ballot'}
};

function getProjectForBallotId(state, ballotId) {
	const id = state.ids.find(id => state.entities[id].BallotID === ballotId);
	return id? state.entities[id].Project: ''
}

const dataSet = 'ballots';
const sortComparer = (b1, b2) => b1.Project === b2.Project? b1.BallotID.localeCompare(b2.BallotID): b1.Project.localeCompare(b2.Project);

const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	sortComparer,
	initialState: {
		currentProject: '',
		currentId: 0
	},
	reducers: {
		setCurrentProject(state, action) {
			const project = action.payload;
			const {entities, currentId} = state;
			if (currentId && entities[currentId].Project !== project)
				state.currentId = 0;
			state.currentProject = project;
		},
		setCurrentId(state, action) {
			const id = action.payload;
			state.currentId = id;
			if (id)
				state.currentProject = state.entities[id].Project;
		}
	},
	extraReducers: builder => {
		builder
		.addMatcher(
			(action) => action.type.startsWith(dataSet + '/getSuccess'),
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
export const {setCurrentProject, setCurrentId} = slice.actions;

const {
	getPending,
	getSuccess,
	getFailure,
	addOne,
	updateOne,
	removeMany
} = slice.actions;

export const loadBallots = () => 
	async (dispatch, getState) => {
		if (getState()[dataSet].loading)
			return;
		dispatch(getPending());
		let response;
		try {
			response = await fetcher.get('/api/ballots');
			if (!Array.isArray(response))
				throw new TypeError("Unexpected response to GET: /api/ballots");
		}
		catch(error) {
			console.log(error)
			await Promise.all([
				dispatch(getFailure()),
				dispatch(setError('Unable to get ballot list', error.toString()))
			]);
			return;
		}
		await dispatch(getSuccess(response));
	}

export const updateBallotSuccess = (id, changes) => updateOne({id, changes});

export const updateBallot = (id, changes) =>
	async (dispatch) => {
		const url = '/api/ballots';
		let response;
		try {
			response = await fetcher.patch(url, [{id, changes}]);
			if (!Array.isArray(response))
				throw new TypeError('Unexpected response to PATCH ' + url);
		}
		catch(error) {
			await dispatch(setError(`Unable to update ballot`, error));
			return;
		}
		const [updatedBallot] = response;
		await dispatch(updateOne({id, changes: updatedBallot}));
	}

export const deleteBallots = (ids) =>
	async (dispatch) => {
		try {
			await fetcher.delete('/api/ballots', ids);
		}
		catch(error) {
			await dispatch(setError("Unable to delete ballot(s)", error));
			return;
		}
		await dispatch(removeMany(ids));
	}

export const addBallot = (ballot) =>
	async (dispatch) => {
		let response;
		try {
			response = await fetcher.post('/api/ballots', [ballot]);
		}
		catch(error) {
			await dispatch(setError(`Unable to add ballot ${ballot.BallotID}`, error.toString()));
			return;
		}
		const [updatedBallot] = response;
		await dispatch(addOne(updatedBallot));
	}

export const setBallotId = (ballotId) =>
	async (dispatch, getState) => {
		const {ids, entities} = getState()[dataSet];
		const id = ids.find(id => entities[id].BallotID === ballotId);
		if (id)
			await dispatch(setCurrentId(id));
	}

/*
 * Selectors
 */
export const getBallotsDataSet = (state) => state[dataSet];

/* Generate project list from the ballot pool */
export const selectProjectOptions = createSelector(
	state => state[dataSet].ids,
	state => state[dataSet].entities,
	(ids, entities) => [...new Set(ids.map(id => entities[id].Project))].sort().map(p => ({value: p, label: p}))
);

/* Generate ballot list for current project or all ballots if current project not set */
export const selectBallotOptions = createSelector(
	state => state[dataSet].ids,
	state => state[dataSet].entities,
	state => state[dataSet].currentProject,
	(ids, entities, currentProject) => {
		let ballotIds = ids;
		if (currentProject)
			ballotIds = ballotIds.filter(id => entities[id].Project === currentProject);
		return ballotIds.map(id => ({value: id, label: `${entities[id].BallotID} ${entities[id].Document}`}));
	}
);
export const getBallot = (state, ballot_id) => {
	const {entities} = state[dataSet];
	return entities[ballot_id];
}

export const getCurrentBallot = (state) => {
	const {entities, currentId} = state[dataSet];
	return entities[currentId];
}

