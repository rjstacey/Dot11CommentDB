import { createSelector } from '@reduxjs/toolkit';
import type { Action, PayloadAction, Dictionary, EntityId } from '@reduxjs/toolkit';

import {
	fetcher,
	setError,
	displayDate,
	createAppTableDataSlice, SortType,
	getAppTableDataSelectors
} from 'dot11-components';

import type { RootState, AppThunk } from '.';

export type ResultsSummary = {
	Approve: number;
	Disapprove: number;
	Abstain: number;
	InvalidVote: number;
	InvalidAbstain: number;
	InvalidDisapprove: number;
	ReturnsPoolSize: number;
	TotalReturns: number;
	BallotReturns: number;
	VotingPoolSize: number;
}

export type CommentsSummary = {
	Count: number;
	CommentIDMin: number;
	CommentIDMax: number;
}

export type Ballot = {
    id: number;
    BallotID: string;
    Project: string;
    Type: number;
    IsRecirc: boolean;
    IsComplete: boolean;
    Start: string | null;
    End: string | null;
    Document: string;
    Topic: string;
    VotingPoolID: string | null;
    prev_id: number | null;
    EpollNum: number | null;
    Results: ResultsSummary | null;
    Comments: CommentsSummary;
}

export type BallotCreate = {
	BallotID: string;
    Project: string;
    Type: number;
    IsRecirc: boolean;
    IsComplete: boolean;
    Start: string;
    End: string;
    Document: string;
    Topic: string;
    VotingPoolID: string;
    prev_id: number;
    EpollNum: number;
}

export type SyncedBallot = Ballot & {
	PrevBallotID: string;
}

export type BallotUpdate = {
	id: number;
	changes: Partial<Ballot>;
}

export const BallotType = {
	CC: 0,			// comment collection
	WG: 1,			// WG ballot
	SA: 2,			// SA ballot
	Motion: 5		// motion
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
export const renderBallotStage = (v: boolean) => v? 'Recirc': 'Initial';

export const fields = {
	Project: {label: 'Project'},
	BallotID: {label: 'Ballot'},
	Type: {label: 'Type', sortType: SortType.NUMERIC, options: BallotTypeOptions, dataRenderer: renderBallotType},
	IsRecirc: {label: 'Stage', sortType: SortType.NUMERIC, options: BallotStageOptions, dataRenderer: renderBallotStage},
	IsComplete: {label: 'Final', sortType: SortType.NUMERIC},
	Document: {label: 'Document'},
	Topic: {label: 'Topic'},
	EpollNum: {label: 'ePoll', sortType: SortType.NUMERIC},
	Start: {label: 'Start', dataRenderer: displayDate, sortType: SortType.STRING},
	End: {label: 'End', dataRenderer: displayDate, sortType: SortType.STRING},
	Results: {label: 'Results', dontFilter: true, dontSort: true},
	Comments: {label: 'Comments', dontFilter: true, dontSort: true},
	VotingPoolID: {label: 'Voting pool'},
	PrevBallotID: {label: 'Prev ballot'}
};

const dataSet = 'ballots';
const sortComparer = (b1: Ballot, b2: Ballot) => b1.Project === b2.Project? b1.BallotID.localeCompare(b2.BallotID): b1.Project.localeCompare(b2.Project);

type ExtraState = {
	currentProject: string;
	currentId: number;
}

const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	sortComparer,
	initialState: {
		currentProject: '',
		currentId: 0
	} as ExtraState,
	reducers: {
		setCurrentProject(state, action: PayloadAction<string>) {
			const project = action.payload;
			const {entities, currentId} = state;
			if (currentId && entities[currentId]?.Project !== project)
				state.currentId = 0;
			state.currentProject = project;
		},
		setCurrentId(state, action: PayloadAction<number>) {
			const id = action.payload;
			state.currentId = id;
			if (id)
				state.currentProject = state.entities[id]!.Project;
		}
	},
	extraReducers: builder => {
		builder
		.addMatcher(
			(action: Action) => action.type === dataSet + '/getSuccess',
			(state) => {
				if (state.currentId) {
					if (state.ids.includes(state.currentId)) {
						state.currentProject = state.entities[state.currentId]!.Project;
					}
					else {
						state.currentId = 0;
						state.currentProject = '';
					}
				}
			}
		)
	}
});

export default slice;

/*
 * Selectors
 */
export const selectBallotsState = (state: RootState) => state[dataSet];

export const selectIds = (state: RootState) => selectBallotsState(state).ids;
export const selectEntities = (state: RootState) => selectBallotsState(state).entities;
export const selectCurrentId = (state: RootState) => selectBallotsState(state).currentId;
export const selectCurrentProject = (state: RootState) => selectBallotsState(state).currentProject

/* Get ballot entities with derived data */
export const selectBallotEntities = createSelector(
	selectIds,
	selectEntities,
	(ids, entities) => {
		const transformedEntities: Dictionary<SyncedBallot> = {};
		for (const id of ids) {
			const ballot = entities[id]!;
			const PrevBallotID = ballot.prev_id?
				entities[ballot.prev_id]?.BallotID || 'Unknown':
				'';
			transformedEntities[id] = {...ballot, PrevBallotID};
		}
		return transformedEntities;
	}
);

/* Generate project list from the ballot pool */
export const selectProjectOptions = createSelector(
	selectIds,
	selectEntities,
	(ids, entities) => [...new Set(ids.map(id => entities[id]!.Project))].sort().map(p => ({value: p, label: p}))
);

/* Generate ballot list for current project or all ballots if current project not set */
export const selectBallotOptions = createSelector(
	selectIds,
	selectEntities,
	selectCurrentProject,
	(ids, entities, currentProject) => {
		let ballotIds = ids as number[];
		if (currentProject)
			ballotIds = ballotIds.filter(id => entities[id]!.Project === currentProject);
		return ballotIds.map(id => ({value: id, label: `${entities[id]!.BallotID} ${entities[id]!.Document}`}));
	}
);

export const selectBallot = (state: RootState, ballot_id: number) => selectBallotEntities(state)[ballot_id];

export const getCurrentBallotId = (state: RootState) => state[dataSet].currentId;

export const selectCurrentBallot = (state: RootState) => {
	const {entities, currentId} = selectBallotsState(state);
	return currentId? entities[currentId]: undefined;
}

export const getBallotId = (state: RootState) => {
	const {entities, currentId} = selectBallotsState(state);
	const ballot = entities[currentId];
	return ballot? ballot.BallotID: '';
}

export const ballotsSelectors = getAppTableDataSelectors(selectBallotsState);

/*
 * Actions
 */
export const ballotsActions = slice.actions;

const {
	getPending,
	getSuccess,
	getFailure,
	addOne,
	updateOne,
	removeMany,
	setCurrentProject: setCurrentProjectLocal,
	setCurrentId: setCurrentIdLocal,
	setUiProperties
} = slice.actions;

export {setUiProperties};

export const setCurrentProject = (project: string): AppThunk<Ballot | undefined> =>
	async (dispatch, getState) => {
		dispatch(setCurrentProjectLocal(project));
		return selectCurrentBallot(getState());
	}

export const setCurrentId = (ballot_id: number): AppThunk<Ballot | undefined> =>
	async (dispatch, getState) => {
		dispatch(setCurrentIdLocal(ballot_id));
		return selectCurrentBallot(getState());
	}

const baseUrl = '/api/ballots';

export const loadBallots = (): AppThunk => 
	async (dispatch, getState) => {
		dispatch(getPending());
		let ballots;
		try {
			ballots = await fetcher.get(baseUrl);
			if (!Array.isArray(ballots))
				throw new TypeError("Unexpected response to GET: " + baseUrl)
		}
		catch(error) {
			dispatch(getFailure());
			dispatch(setError('Unable to get ballot list', error));
			return;
		}
		for (const b1 of ballots) {
			const bPrev = ballots.find(b2 => b2.id === b1.prev_id);
			b1.PrevBallotID = bPrev? bPrev.BallotID: '';
		}
		dispatch(getSuccess(ballots));
	}

export const updateBallotSuccess = (id: EntityId, changes: Partial<Ballot>) => updateOne({id, changes});

export const updateBallot = (id: number, changes: Partial<Ballot>): AppThunk =>
	async (dispatch, getState) => {
		let response;
		try {
			response = await fetcher.patch(baseUrl, [{id, changes}]);
			if (!Array.isArray(response))
				throw new TypeError('Unexpected response to PATCH: ' + baseUrl);
		}
		catch(error) {
			dispatch(setError(`Unable to update ballot`, error));
			return;
		}
		const [updatedBallot] = response;
		if (updatedBallot.prev_id) {
			const {entities} = selectBallotsState(getState());
			updatedBallot.PrevBallotID = entities[updatedBallot.prev_id] || '';
		}
		dispatch(updateOne({id, changes: updatedBallot}));
	}

export const deleteBallots = (ids: EntityId[]): AppThunk =>
	async (dispatch) => {
		try {
			await fetcher.delete(baseUrl, ids);
		}
		catch(error) {
			dispatch(setError("Unable to delete ballot(s)", error));
			return;
		}
		dispatch(removeMany(ids));
	}

export const addBallot = (ballot: BallotCreate): AppThunk =>
	async (dispatch, getState) => {
		let response;
		try {
			response = await fetcher.post(baseUrl, [ballot]);
			if (!Array.isArray(response))
				throw new TypeError("Unexpected response to POST: " + baseUrl);
		}
		catch(error) {
			dispatch(setError(`Unable to add ballot ${ballot.BallotID}`, error));
			return;
		}
		const [updatedBallot] = response;
		if (updatedBallot.prev_id) {
			const {entities} = selectBallotsState(getState());
			updatedBallot.PrevBallotID = entities[updatedBallot.prev_id] || '';
		}
		dispatch(addOne(updatedBallot));
	}

export const setBallotId = (ballotId: string): AppThunk =>
	async (dispatch, getState) => {
		const {ids, entities} = selectBallotsState(getState());
		const id = ids.find(id => entities[id]!.BallotID === ballotId);
		if (id)
			dispatch(setCurrentId(id as number));
	}

