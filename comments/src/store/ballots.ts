import { createAction, createSelector } from '@reduxjs/toolkit';
import type { Action, PayloadAction, Dictionary, EntityId } from '@reduxjs/toolkit';

import {
	fetcher,
	setError,
	displayDate,
	createAppTableDataSlice, SortType,
	getAppTableDataSelectors,
	isObject,
} from 'dot11-components';

import type { RootState, AppThunk } from '.';
import { AccessLevel } from './user';
import { selectGroupEntities, selectGroups, selectWorkingGroup, selectWorkingGroupName } from './groups';

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
	Commenters: number;
}

export type CommentsSummary = {
	Count: number;
	CommentIDMin: number | null;
	CommentIDMax: number | null;
}

export type Ballot = {
	id: number;
	groupId: string | null;
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
	Voters: number;
}

export type BallotCommentsSummary = {
	id: number;
	Comments: CommentsSummary;
}

export type BallotEdit = {
	groupId: string | null;
	BallotID: string;
	Project: string;
	Type: number;
	IsRecirc: boolean;
	IsComplete: boolean;
	Start: string;
	End: string;
	Document: string;
	Topic: string;
	VotingPoolID: string | null;
	prev_id: number | null;
	EpollNum: number;
}

export type SyncedBallot = Ballot & {
	PrevBallotID: string;
	GroupName: string;
}

export type BallotUpdate = {
	id: number;
	changes: Partial<BallotEdit>;
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
export const renderBallotType = (type: number) => BallotTypeLabels[type] || 'Unknown';

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
	GroupName: {label: 'Group'},
	Project: {label: 'Project'},
	BallotID: {label: 'Ballot'},
	Type: {label: 'Type', sortType: SortType.NUMERIC, options: BallotTypeOptions, dataRenderer: renderBallotType},
	Stage: {label: 'Stage'},
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

export const getField = (entity: Ballot, dataKey: string) => {
	if (dataKey === 'Stage') {
		if (entity.Type === BallotType.SA || entity.Type === BallotType.WG)
			return entity.IsRecirc? "Recirc": "Inital";
		return "";
	}
	return entity[dataKey];
}

export type GroupProject = {
	groupId: string | null;
	project: string | null;
}

type ExtraState = {
	currentGroupId: string | null;
	currentProject: string | null;
	currentBallot_id: number | null;
}

const initialState: ExtraState = {
	currentGroupId: null,
	currentProject: null,
	currentBallot_id: null,
};

const sortComparer = (b1: Ballot, b2: Ballot) => b1.Project === b2.Project? b1.BallotID.localeCompare(b2.BallotID): b1.Project.localeCompare(b2.Project);
const dataSet = 'ballots';

const clear = createAction(dataSet + '/clear');

const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	sortComparer,
	initialState,
	reducers: {
		setCurrentGroupProject(state, action: PayloadAction<GroupProject>) {
			const {groupId, project} = action.payload;
			const {entities, currentBallot_id} = state;
			const currentBallot = (currentBallot_id && entities[currentBallot_id]) || undefined;
			if (currentBallot && (currentBallot.groupId !== groupId || currentBallot.Project !== project))
				state.currentBallot_id = null;
			state.currentGroupId = groupId;
			state.currentProject = project;
		},
		setCurrentBallot_id(state, action: PayloadAction<number | null>) {
			const id = action.payload;
			state.currentBallot_id = id;
			const ballot = (id && state.entities[id]) || undefined;
			if (ballot) {
				state.currentGroupId = ballot.groupId;
				state.currentProject = ballot.Project;
			}
		}
	},
	extraReducers: (builder, dataAdapter) => {
		builder
			.addMatcher(
				(action: Action) => action.type === dataSet + '/getSuccess',
				(state) => {
					if (state.currentBallot_id) {
						const ballot = state.entities[state.currentBallot_id];
						if (ballot) {
							state.currentGroupId = ballot.groupId;
							state.currentProject = ballot.Project;
						}
						else {
							state.currentBallot_id = null;
							state.currentGroupId = null;
							state.currentProject = null;
						}
					}
				}
			)
			.addMatcher(
				(action: Action) => action.type === clear,
				(state) => {
					dataAdapter.removeAll(state);
					state.valid = false;
					state.currentBallot_id = null;
					state.currentGroupId = null;
					state.currentProject = null;
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
export const selectCurrentBallot_id = (state: RootState) => selectBallotsState(state).currentBallot_id;
export const selectCurrentGroupId = (state: RootState) => selectBallotsState(state).currentGroupId;
export const selectCurrentProject = (state: RootState) => selectBallotsState(state).currentProject;
export const selectCurrentBallotID = (state: RootState) => {
	const {currentBallot_id, entities} = selectBallotsState(state);
	return (currentBallot_id && entities[currentBallot_id]?.BallotID) || null;
}

/* Get ballot entities with derived data */
const selectSyncedBallotEntities = createSelector(
	selectBallotIds,
	selectBallotEntities,
	selectGroupEntities,
	(ids, entities, groupEntities) => {
		const syncedEntities: Dictionary<SyncedBallot> = {};
		ids.forEach(id => {
			const ballot = entities[id]!;
			const PrevBallotID = ballot.prev_id?
				entities[ballot.prev_id]?.BallotID || 'Unknown':
				'';
			const GroupName = (ballot.groupId && (groupEntities[ballot.groupId]?.name || "Unknown")) || "(Blank)";
			syncedEntities[id] = {...ballot, PrevBallotID, GroupName};
		});
		return syncedEntities;
	}
);

export const selectBallotsAccess = (state: RootState) => selectWorkingGroup(state)?.permissions.ballots || AccessLevel.none;

export type GroupProjectOption = GroupProject & {
	label: string;
}

/* Generate project list from the ballot pool */
export const selectGroupProjectOptions = createSelector(
	selectGroups,
	selectBallotIds,
	selectBallotEntities,
	(groups, ballotIds, ballotEntities) => {
		const options: GroupProjectOption[] = [];
		groups.forEach(group => {
			if (group.project)
				options.push({groupId: group.id, project: group.project, label: group.name + ' / ' + group.project});
		});
		ballotIds.forEach(id => {
			const ballot = ballotEntities[id]!;
			if (!options.find(o => o.groupId === ballot.groupId && o.project === ballot.Project)) {
				const group = groups.find(group => group.id === ballot.groupId);
				const label = (group?.name || 'Unknown') + ' / ' + ballot.Project;
				options.push({groupId: ballot.groupId, project: ballot.Project, label});
			}
		});
		return options
			.sort((o1, o2) => o1.label.localeCompare(o2.label))
	}
);

/* Generate ballot list for current project or all ballots if current project not set */
export const selectBallotOptions = createSelector(
	selectBallotIds,
	selectBallotEntities,
	selectCurrentGroupId,
	selectCurrentProject,
	(ids, entities, groupId, project) => {
		let ballotIds = ids as number[];
		if (groupId || project) {
			ballotIds = ballotIds.filter(id => {
					const ballot = entities[id]!;
					return ballot.groupId === groupId && ballot.Project === project;
				});
		}
		//return ballotIds.map(id => ({value: id, label: `${entities[id]!.BallotID} ${entities[id]!.Document}`}));
		return ballotIds.map(id => entities[id]!);
	}
);

export const selectBallot = (state: RootState, ballot_id: number) => selectSyncedBallotEntities(state)[ballot_id];

export const selectCurrentBallot = (state: RootState) => {
	const {entities, currentBallot_id} = selectBallotsState(state);
	return currentBallot_id? entities[currentBallot_id]: undefined;
}

export const ballotsSelectors = getAppTableDataSelectors(selectBallotsState, {selectEntities: selectSyncedBallotEntities, getField});

/*
 * Actions
 */
export const ballotsActions = slice.actions;

const {
	getPending,
	getSuccess,
	getFailure,
	addOne,
	updateMany,
	setOne,
	removeMany,
	setCurrentGroupProject: setCurrentGroupProjectLocal,
	setCurrentBallot_id: setCurrentBallotIdLocal,
	setUiProperties,
	setSelected: setSelectedBallots,
} = slice.actions;

export { setUiProperties, setSelectedBallots };

export const updateBallotsLocal = (ballots: ({id: number} & Partial<Omit<Ballot, "id">>)[]): AppThunk =>
	async (dispatch) => {
		const updates = ballots.map(ballot => {
			const {id, ...changes} = ballot;
			return {id, changes};
		});
		dispatch(updateMany(updates));
	}

export const setCurrentGroupProject = (value: GroupProject): AppThunk<Ballot | undefined> =>
	async (dispatch, getState) => {
		dispatch(setCurrentGroupProjectLocal(value));
		return selectCurrentBallot(getState());
	}

export const setCurrentBallot_id = (ballot_id: number | null): AppThunk<Ballot | undefined> =>
	async (dispatch, getState) => {
		dispatch(setCurrentBallotIdLocal(ballot_id));
		return selectCurrentBallot(getState());
	}

function validCommentsSummary(summary: any): summary is CommentsSummary {
	return isObject(summary) &&
		typeof summary.Count === 'number' &&
		(summary.CommentIDMax === null || typeof summary.CommentIDMax === 'number') &&
		(summary.CommentIDMin === null || typeof summary.CommentIDMin === 'number');
}

export function validBallotCommentsSummary(ballot: any): ballot is {id: number; Comments: CommentsSummary} {
	return isObject(ballot) && validCommentsSummary(ballot.Comments);
}

export function validBallot(ballot: any): ballot is Ballot {
	return isObject(ballot) &&
		typeof ballot.id === 'number' &&
		typeof ballot.BallotID === 'string' &&
		typeof ballot.Project === 'string'/* &&
		typeof ballot.groupId === 'string'*/;
}

function validResponse(response: any): response is Ballot[] {
	return Array.isArray(response) && response.every(validBallot);
}

let loadBallotsPromise: Promise<Ballot[]> | null;
export const loadBallots = (): AppThunk<Ballot[]> =>
	async (dispatch, getState) => {
		if (loadBallotsPromise)
			return loadBallotsPromise;
		dispatch(getPending());
		const groupName = selectWorkingGroupName(getState());
		const url = `/api/${groupName}/ballots`;
		loadBallotsPromise = (fetcher.get(url) as Promise<Ballot[]>)
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

export const initBallots = loadBallots;

/** If ballots have already been loaded, then return the list. Otherwise, load the ballots. */
export const getBallots = (): AppThunk<Ballot[]> =>
	async (dispatch, getState) => {
		const state = getState();
		const {valid, loading, ids, entities} = selectBallotsState(state);
		if (!valid || loading)
			return dispatch(loadBallots());
		return ids.map(id => entities[id]!);
	}

export const clearBallots = (): AppThunk =>
	async (dispatch) => {
		dispatch(clear());
	}

export const updateBallot = (id: number, changes: Partial<Ballot>): AppThunk =>
	async (dispatch, getState) => {
		const groupName = selectWorkingGroupName(getState());
		const url = `/api/${groupName}/ballots`;
		let response: any;
		try {
			response = await fetcher.patch(url, [{id, changes}]);
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
	async (dispatch, getState) => {
		const groupName = selectWorkingGroupName(getState());
		const url = `/api/${groupName}/ballots`;
		try {
			await fetcher.delete(url, ids);
		}
		catch(error) {
			dispatch(setError("Unable to delete ballot(s)", error));
			return;
		}
		dispatch(removeMany(ids));
	}

export const addBallot = (ballot: BallotEdit): AppThunk<Ballot | undefined> =>
	async (dispatch, getState) => {
		const groupName = selectWorkingGroupName(getState());
		const url = `/api/${groupName}/ballots`;
		let response: any;
		try {
			response = await fetcher.post(url, [ballot]);
			if (!validResponse(response) || response.length !== 1)
				throw new TypeError("Unexpected response");
		}
		catch(error) {
			dispatch(setError(`Unable to add ballot ${ballot.BallotID}`, error));
			return;
		}
		const [updatedBallot] = response;
		dispatch(addOne(updatedBallot));
		return updatedBallot;
	}
