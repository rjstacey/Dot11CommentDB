import { createSelector } from '@reduxjs/toolkit';
import type { Action, PayloadAction, Dictionary, EntityId } from '@reduxjs/toolkit';

import {
	fetcher,
	setError,
	displayDate,
	createAppTableDataSlice, SortType,
	getAppTableDataSelectors,
	isObject
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

export const selectBallotIds = (state: RootState) => selectBallotsState(state).ids;
export const selectBallotEntities = (state: RootState) => selectBallotsState(state).entities;
export const selectCurrentId = (state: RootState) => selectBallotsState(state).currentId;
export const selectCurrentProject = (state: RootState) => selectBallotsState(state).currentProject
export const selectCurrentBallotID = (state: RootState) => {
	const {currentId, entities} = selectBallotsState(state);
	return entities[currentId]?.BallotID;
}

/* Get ballot entities with derived data */
const selectSyncedBallotEntities = createSelector(
	selectBallotIds,
	selectBallotEntities,
	(ids, entities) => {
		const syncedEntities: Dictionary<SyncedBallot> = {};
		ids.forEach(id => {
			const ballot = entities[id]!;
			const PrevBallotID = ballot.prev_id?
				entities[ballot.prev_id]?.BallotID || 'Unknown':
				'';
			syncedEntities[id] = {...ballot, PrevBallotID};
		});
		return syncedEntities;
	}
);

/* Generate project list from the ballot pool */
export const selectProjectOptions = createSelector(
	selectBallotIds,
	selectBallotEntities,
	(ids, entities) => [...new Set(ids.map(id => entities[id]!.Project))].sort().map(p => ({value: p, label: p}))
);

/* Generate ballot list for current project or all ballots if current project not set */
export const selectBallotOptions = createSelector(
	selectBallotIds,
	selectBallotEntities,
	selectCurrentProject,
	(ids, entities, currentProject) => {
		let ballotIds = ids as number[];
		if (currentProject)
			ballotIds = ballotIds.filter(id => entities[id]!.Project === currentProject);
		return ballotIds.map(id => ({value: id, label: `${entities[id]!.BallotID} ${entities[id]!.Document}`}));
	}
);

export const selectBallot = (state: RootState, ballot_id: number) => selectSyncedBallotEntities(state)[ballot_id];

export const selectCurrentBallot = (state: RootState) => {
	const {entities, currentId} = selectBallotsState(state);
	return currentId? entities[currentId]: undefined;
}

export const ballotsSelectors = getAppTableDataSelectors(selectBallotsState, {selectEntities: selectSyncedBallotEntities});

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
	setOne,
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

export function validBallot(ballot: any): ballot is Ballot {
	return isObject(ballot) &&
		typeof ballot.id === 'number' &&
		typeof ballot.BallotID === 'string' &&
		typeof ballot.Project === 'string';
}

function validResponse(response: any): response is Ballot[] {
	return Array.isArray(response) && response.every(validBallot);
}

let loadBallotsPromise: Promise<Ballot[]> | null;
export const loadBallots = (): AppThunk<Ballot[]> => 
	async (dispatch) => {
		if (loadBallotsPromise)
			return loadBallotsPromise;
		dispatch(getPending());
		loadBallotsPromise = (fetcher.get(baseUrl) as Promise<Ballot[]>)
			.then((response: any) => {
				if (!validResponse(response))
					throw new TypeError("Unexpected response");
				dispatch(getSuccess(response));
				return response;
			})
			.catch((error: any) => {
				dispatch(getFailure());
				dispatch(setError('Unable to get ballot list', error));
				return [];
			})
			.finally(() => {
				loadBallotsPromise = null;
			});
		return loadBallotsPromise;
	}

/** If ballots have already been loaded, then return the list. Otherwise, load the ballots. */
export const getBallots = (): AppThunk<Ballot[]> =>
	async (dispatch, getState) => {
		const {valid, loading, ids, entities} = selectBallotsState(getState());
		if (!valid || loading)
			return dispatch(loadBallots());
		return ids.map(id => entities[id]!);
	}

export const updateBallotSuccess = (id: EntityId, changes: Partial<Ballot>) => updateOne({id, changes});

export const updateBallot = (id: number, changes: Partial<Ballot>): AppThunk =>
	async (dispatch) => {
		let response: any;
		try {
			response = await fetcher.patch(baseUrl, [{id, changes}]);
			if (!validResponse(response))
				throw new TypeError("Unexpected response");
		}
		catch(error) {
			dispatch(setError(`Unable to update ballot`, error));
			return;
		}
		const [ballot] = response;
		dispatch(setOne(ballot));
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
		let response: any;
		try {
			response = await fetcher.post(baseUrl, [ballot]);
			if (!validResponse(response) || response.length !== 1)
				throw new TypeError("Unexpected response");
		}
		catch(error) {
			dispatch(setError(`Unable to add ballot ${ballot.BallotID}`, error));
			return;
		}
		const [updatedBallot] = response;
		dispatch(addOne(updatedBallot));
	}

export const setBallotId = (ballotId: string): AppThunk =>
	async (dispatch, getState) => {
		const {ids, entities} = selectBallotsState(getState());
		const id = ids.find(id => entities[id]!.BallotID === ballotId);
		if (id)
			dispatch(setCurrentId(id as number));
	}

