import { createAction, createSelector } from "@reduxjs/toolkit";
import type { Action, PayloadAction, EntityId } from "@reduxjs/toolkit";

import {
	fetcher,
	setError,
	displayDate,
	createAppTableDataSlice,
	FieldType,
	getAppTableDataSelectors,
} from "dot11-components";

import type { RootState, AppThunk } from ".";
import { AccessLevel } from "./user";
import {
	selectGroupEntities,
	selectGroups,
	selectTopLevelGroupByName,
} from "./groups";

import {
	Ballot,
	ballotsSchema,
	BallotUpdate,
	BallotChange,
	BallotCreate,
} from "@schemas/ballots";

export type { Ballot, BallotUpdate, BallotChange, BallotCreate };

export const BallotType = {
	CC: 0, // comment collection
	WG: 1, // WG ballot
	SA: 2, // SA ballot
	//Motion: 5, // motion
};

export type SyncedBallot = Ballot & {
	GroupName: string;
};

export const BallotTypeLabels = {
	[BallotType.CC]: "CC",
	[BallotType.WG]: "LB",
	[BallotType.SA]: "SA",
	//[BallotType.Motion]: "Motion",
};

export const BallotTypeOptions = Object.values(BallotType).map((v) => ({
	value: v,
	label: BallotTypeLabels[v],
}));
export const renderBallotType = (type: number) =>
	BallotTypeLabels[type] || "Unknown";

export const fields = {
	GroupName: { label: "Group" },
	Project: { label: "Project" },
	Type: {
		label: "Type",
		type: FieldType.NUMERIC,
		options: BallotTypeOptions,
		dataRenderer: renderBallotType,
	},
	number: {
		label: "Number",
		type: FieldType.NUMERIC,
	},
	BallotID: {
		label: "ID",
	},
	stage: {
		label: "Stage",
		dataRenderer: getStage,
		type: FieldType.NUMERIC,
	},
	IsComplete: { label: "Final", type: FieldType.NUMERIC },
	Document: { label: "Document" },
	Topic: { label: "Topic" },
	EpollNum: { label: "ePoll", type: FieldType.NUMERIC },
	Start: { label: "Start", dataRenderer: displayDate, type: FieldType.DATE },
	End: { label: "End", dataRenderer: displayDate, type: FieldType.DATE },
	Results: { label: "Results", dontFilter: true, dontSort: true },
	Comments: { label: "Comments", dontFilter: true, dontSort: true },
	PrevBallotID: { label: "Prev ballot" },
};

export function getStage(ballot: Ballot) {
	return ballot.stage === 0 ? "Initial" : `Recirc ${ballot.stage}`;
}

export function getBallotId(ballot: Ballot) {
	if (ballot.Type === BallotType.CC) {
		return "CC" + (ballot.number || "(Blank)");
	} else if (ballot.Type === BallotType.WG) {
		return "LB" + (ballot.number || "(Blank)");
	} else if (ballot.Type === BallotType.SA) {
		return (
			ballot.Project +
			"-" +
			(ballot.stage === 0 ? "I" : "R" + ballot.stage)
		);
	}

	return ballot.id.toString();
}

export function getField(entity: Ballot, dataKey: string) {
	if (dataKey === "Stage") {
		if (entity.Type === BallotType.SA || entity.Type === BallotType.WG) {
			return entity.stage === 0 ? "Initial" : `Recirc ${entity.stage}`;
		}
		return "";
	}
	if (dataKey === "BallotID") {
		return getBallotId(entity);
	}
	return entity[dataKey as keyof Ballot];
}

export type GroupProject = {
	groupId: string | null;
	project: string | null;
};

type ExtraState = {
	groupName: string | null;
	lastLoad: string | null;
	currentGroupProject: GroupProject;
	currentBallot_id: number | null;
};

const initialState: ExtraState = {
	groupName: null,
	lastLoad: null,
	currentGroupProject: { groupId: null, project: null },
	currentBallot_id: null,
};

const sortComparer = (b1: Ballot, b2: Ballot) => {
	if (b1.Project === b2.Project)
		return (b1.Start || "").localeCompare(b2.Start || "");
	return (b1.Project || "").localeCompare(b2.Project || "");
};
const dataSet = "ballots";
const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	sortComparer,
	initialState,
	reducers: {
		setCurrentGroupProject(state, action: PayloadAction<GroupProject>) {
			const { groupId, project } = action.payload;
			state.currentBallot_id = null;
			state.currentGroupProject.groupId = groupId;
			state.currentGroupProject.project = project;
		},
		setCurrentBallot_id(state, action: PayloadAction<number | null>) {
			const id = action.payload;
			const { entities } = state;
			const ballot = id ? entities[id] : undefined;
			const groupId = ballot?.groupId || null;
			const project = ballot?.Project || null;
			state.currentBallot_id = ballot ? ballot.id : null;
			state.currentGroupProject.groupId = groupId;
			state.currentGroupProject.project = project;
		},
	},
	extraReducers: (builder, dataAdapter) => {
		builder
			.addMatcher(
				(action: Action) => action.type === getPending.toString(),
				(state, action: ReturnType<typeof getPending>) => {
					const { groupName } = action.payload;
					if (groupName !== state.groupName) {
						state.groupName = groupName;
						state.lastLoad = null;
						state.valid = false;
						dataAdapter.removeAll(state);
					}
				}
			)
			.addMatcher(
				(action: Action) => action.type === dataSet + "/getSuccess",
				(state) => {
					state.lastLoad = new Date().toISOString();
					const { entities, currentBallot_id: id } = state;
					const ballot = id ? entities[id] : undefined;
					const groupId = ballot?.groupId || null;
					const project = ballot?.Project || null;
					state.currentBallot_id = ballot ? ballot.id : null;
					state.currentGroupProject.groupId = groupId;
					state.currentGroupProject.project = project;
				}
			)
			.addMatcher(
				(action: Action) => action.type === clearBallots.toString(),
				(state) => {
					dataAdapter.removeAll(state);
					state.valid = false;
					state.lastLoad = null;
					state.currentBallot_id = null;
					state.currentGroupProject.groupId = null;
					state.currentGroupProject.project = null;
				}
			);
	},
});

export default slice;

/* Slice actions */
export const ballotsActions = slice.actions;

const {
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

// Overload getPending() with one that sets groupName
const getPending = createAction<{ groupName: string }>(dataSet + "/getPending");
export const clearBallots = createAction(dataSet + "/clear");

export { setUiProperties, setSelectedBallots };

/* Selectors */
export const selectBallotsState = (state: RootState) => state[dataSet];
const selectBallotsGroupName = (state: RootState) =>
	selectBallotsState(state).groupName;
const selectBallotsAge = (state: RootState) => {
	let lastLoad = selectBallotsState(state).lastLoad;
	if (!lastLoad) return NaN;
	return new Date().valueOf() - new Date(lastLoad).valueOf();
};
export const selectBallotIds = (state: RootState) =>
	selectBallotsState(state).ids;
export const selectBallotEntities = (state: RootState) =>
	selectBallotsState(state).entities;
export const selectCurrentBallot_id = (state: RootState) =>
	selectBallotsState(state).currentBallot_id;
export const selectCurrentGroupProject = (state: RootState) =>
	selectBallotsState(state).currentGroupProject;
export const selectCurrentBallotID = (state: RootState) => {
	const { currentBallot_id, entities } = selectBallotsState(state);
	if (currentBallot_id === null) return;
	const ballot = entities[currentBallot_id]!;
	return ballot ? getBallotId(ballot) : undefined;
};

export const selectBallots = createSelector(
	selectBallotIds,
	selectBallotEntities,
	(ids, entities) => ids.map((id) => entities[id]!)
);

export const selectBallotByBallotID = (state: RootState, ballotId: string) => {
	const ballots = selectBallots(state);
	let m = ballotId.match(/(CC|LB)(\d+)/);
	if (m) {
		const label = m[1];
		const entry = Object.entries(BallotTypeLabels).find(
			([key, value]) => value === label
		);
		if (!entry) return;
		const type = Number(entry[0]);
		const n = Number(m[2]);
		return ballots.find((b) => b.Type === type && b.number === n);
	}
	m = ballotId.match(/([a-zA-Z0-9.]+)-(I|R)(\d*)/);
	if (m) {
		const project = m[1];
		let stage = 0;
		if (m[2] === "R") stage = Number(m[3]);
		return ballots.find(
			(b) =>
				b.Type === BallotType.SA &&
				b.Project === project &&
				b.stage === stage
		);
	}
	m = ballotId.match(/\d+/);
	if (m) {
		const id = Number(m[0]);
		return ballots.find((b) => b.id === id);
	}
};

/* Get ballot entities with derived data */
const selectSyncedBallotEntities = createSelector(
	selectBallotIds,
	selectBallotEntities,
	selectGroupEntities,
	(ids, entities, groupEntities) => {
		const syncedEntities: Record<EntityId, SyncedBallot> = {};
		ids.forEach((id) => {
			const ballot = entities[id]!;
			const GroupName =
				(ballot.groupId &&
					(groupEntities[ballot.groupId]?.name || "Unknown")) ||
				"(Blank)";
			syncedEntities[id] = { ...ballot, GroupName };
		});
		return syncedEntities;
	}
);

export const selectBallotsWorkingGroup = (state: RootState) => {
	const { groupName } = selectBallotsState(state);
	return groupName ? selectTopLevelGroupByName(state, groupName) : undefined;
};

export const selectBallotsAccess = (state: RootState) => {
	const group = selectBallotsWorkingGroup(state);
	return group?.permissions.ballots || AccessLevel.none;
};

export type GroupProjectOption = GroupProject & {
	label: string;
};

/* Generate project list from the ballot pool */
export const selectGroupProjectOptions = createSelector(
	selectGroups,
	selectBallotIds,
	selectBallotEntities,
	(groups, ballotIds, ballotEntities) => {
		const options: GroupProjectOption[] = [];
		groups.forEach((group) => {
			if (group.project)
				options.push({
					groupId: group.id,
					project: group.project,
					label: group.name + " / " + group.project,
				});
		});
		ballotIds.forEach((id) => {
			const ballot = ballotEntities[id]!;
			if (
				!options.find(
					(o) =>
						o.groupId === ballot.groupId &&
						o.project === ballot.Project
				)
			) {
				const group = groups.find(
					(group) => group.id === ballot.groupId
				);
				const label =
					(group?.name || "Unknown") + " / " + ballot.Project;
				options.push({
					groupId: ballot.groupId,
					project: ballot.Project,
					label,
				});
			}
		});
		return options.sort((o1, o2) => o1.label.localeCompare(o2.label));
	}
);

/* Generate ballot list for current project or all ballots if current project not set */
export const selectBallotOptions = createSelector(
	selectBallotIds,
	selectBallotEntities,
	selectCurrentGroupProject,
	(ids, entities, groupProject) => {
		let ballotIds = ids as number[];
		if (groupProject.groupId || groupProject.project) {
			ballotIds = ballotIds.filter((id) => {
				const ballot = entities[id]!;
				return (
					ballot.groupId === groupProject.groupId &&
					ballot.Project === groupProject.project
				);
			});
		}
		return ballotIds.map((id) => entities[id]!);
	}
);

export const selectBallotSeries = createSelector(
	(state: RootState, ballot_id: EntityId) => ballot_id,
	selectBallotIds,
	selectBallotEntities,
	(ballot_id, ids, entities) => {
		function getBallotSeries(ballot: Ballot): Ballot[] {
			const ballotSeries = [ballot];
			for (const id of ids) {
				const ballotNext = entities[id]!;
				if (ballotNext.prev_id === ballot.id)
					return ballotSeries.concat(getBallotSeries(ballotNext));
			}
			return ballotSeries;
		}
		const ballot = entities[ballot_id];
		return ballot ? getBallotSeries(ballot) : undefined;
	}
);

export const selectBallotSeriesId = (state: RootState, ballot: Ballot) => {
	const entities = selectBallotEntities(state);
	let ballotInitial: Ballot = ballot;
	while (ballotInitial.prev_id && entities[ballotInitial.prev_id])
		ballotInitial = entities[ballotInitial.prev_id]!;
	return ballotInitial.id;
};

export const selectBallot = (state: RootState, ballot_id: number) =>
	selectSyncedBallotEntities(state)[ballot_id];

export const selectCurrentBallot = (state: RootState) => {
	const { entities, currentBallot_id } = selectBallotsState(state);
	return currentBallot_id ? entities[currentBallot_id] : undefined;
};

export const selectCurrentBallotSeries = createSelector(
	selectBallotEntities,
	selectCurrentBallot_id,
	(entities, currentBallot_id) => {
		const ballots: Ballot[] = [];
		let ballot: Ballot | undefined = currentBallot_id
			? entities[currentBallot_id]
			: undefined;
		while (ballot) {
			ballots.unshift(ballot);
			ballot = ballot.prev_id ? entities[ballot.prev_id] : undefined;
		}
		return ballots;
	}
);

export const ballotsSelectors = getAppTableDataSelectors(selectBallotsState, {
	selectEntities: selectSyncedBallotEntities,
	getField,
});

/* Thunk actions */
export const updateBallotsLocal =
	(ballots: ({ id: number } & Partial<Omit<Ballot, "id">>)[]): AppThunk =>
	async (dispatch) => {
		const updates = ballots.map((ballot) => {
			const { id, ...changes } = ballot;
			return { id, changes };
		});
		dispatch(updateMany(updates));
	};

export const setCurrentGroupProject =
	(groupProject: GroupProject): AppThunk<Ballot | undefined> =>
	async (dispatch, getState) => {
		// See if the current ballot matches
		const currentBallot = selectCurrentBallot(getState());
		if (
			currentBallot &&
			currentBallot.groupId === groupProject.groupId &&
			currentBallot.Project === groupProject.project
		)
			return currentBallot;

		// Find newest ballot for this project
		const ballots = selectBallots(getState())
			.filter(
				(b) =>
					b.groupId === groupProject.groupId &&
					b.Project === groupProject.project
			)
			.sort(
				(b1, b2) =>
					new Date(b1.End || "").valueOf() -
					new Date(b2.End || "").valueOf()
			);
		const ballot = ballots[ballots.length - 1];
		dispatch(
			ballot
				? setCurrentBallotIdLocal(ballot.id)
				: setCurrentGroupProjectLocal(groupProject)
		);
		return ballot;
	};

export const setCurrentBallot_id =
	(ballot_id: number | null): AppThunk<Ballot | undefined> =>
	async (dispatch, getState) => {
		dispatch(setCurrentBallotIdLocal(ballot_id));
		return selectCurrentBallot(getState());
	};

const AGE_STALE = 60 * 60 * 1000; // 1 hour
let loading = false;
let loadingPromise: Promise<void>;
export const loadBallots =
	(groupName: string, force = false): AppThunk<void> =>
	async (dispatch, getState) => {
		const state = getState();
		const current = selectBallotsState(state);
		if (groupName === current.groupName) {
			if (loading) return loadingPromise;
			const age = selectBallotsAge(getState());
			if (!force && age && age < AGE_STALE) return loadingPromise;
		}
		dispatch(getPending({ groupName }));
		const url = `/api/${groupName}/ballots`;
		loading = true;
		loadingPromise = fetcher
			.get(url)
			.then((response: any) => {
				const ballots = ballotsSchema.parse(response);
				dispatch(getSuccess(ballots));
			})
			.catch((error: any) => {
				dispatch(getFailure());
				dispatch(setError("GET " + url, error));
			})
			.finally(() => {
				loading = false;
			});
		return loadingPromise;
	};

export const updateBallots =
	(updates: BallotUpdate[]): AppThunk =>
	async (dispatch, getState) => {
		const groupName = selectBallotsGroupName(getState());
		const url = `/api/${groupName}/ballots`;
		let ballots: Ballot[];
		try {
			const response = await fetcher.patch(url, updates);
			ballots = ballotsSchema.parse(response);
		} catch (error) {
			dispatch(setError("PATCH " + url, error));
			return;
		}
		const [ballot] = ballots;
		dispatch(setOne(ballot));
	};

export const deleteBallots =
	(ids: EntityId[]): AppThunk =>
	async (dispatch, getState) => {
		const groupName = selectBallotsGroupName(getState());
		const url = `/api/${groupName}/ballots`;
		try {
			await fetcher.delete(url, ids);
		} catch (error) {
			dispatch(setError("DELETE " + url, error));
			return;
		}
		dispatch(removeMany(ids));
	};

export const addBallot =
	(ballot: BallotCreate): AppThunk<Ballot | undefined> =>
	async (dispatch, getState) => {
		const groupName = selectBallotsGroupName(getState());
		const url = `/api/${groupName}/ballots`;
		let ballots: Ballot[];
		try {
			const response = await fetcher.post(url, [ballot]);
			ballots = ballotsSchema.parse(response);
			if (ballots.length !== 1)
				throw new TypeError("Unexpected response");
		} catch (error) {
			dispatch(setError("Unable to add ballot", error));
			return;
		}
		const [updatedBallot] = ballots;
		dispatch(addOne(updatedBallot));
		return updatedBallot;
	};
