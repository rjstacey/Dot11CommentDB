import {
	createSelector,
	createAction,
	createEntityAdapter,
	Action,
	PayloadAction,
	Dictionary,
	EntityId,
} from "@reduxjs/toolkit";
import { DateTime } from "luxon";

import {
	fetcher,
	setError,
	createAppTableDataSlice,
	FieldType,
	getAppTableDataSelectors,
	isObject,
	Fields,
} from "dot11-components";

import type { RootState, AppThunk } from ".";
import {
	selectMemberEntities,
	Member,
	ExpectedStatusType,
	StatusType,
} from "./members";

export const fields: Fields = {
	id: { label: "id", type: FieldType.NUMERIC },
	SAPIN: { label: "SA PIN", type: FieldType.NUMERIC },
	Name: { label: "Name" },
	Email: { label: "Email" },
	Affiliation: { label: "Affiliation" },
	Status: { label: "Status" },
	ExpectedStatus: { label: "Expected status" },
	Excused: { label: "Excused", type: FieldType.NUMERIC },
	CommentCount: { label: "Comments", type: FieldType.NUMERIC },
	ballot_id: { label: "Ballot ID", type: FieldType.NUMERIC },
	Summary: { label: "Summary" },
	ballotSeries_0: { label: "Ballot series 1" },
	ballotSeries_1: { label: "Ballot series 2" },
	ballotSeries_2: { label: "Ballot series 3" },
};

type Ballot = {
	id: number;
	number: number;
	Type: number;
	Project: string;
};

export const BallotType = {
	CC: 0, // comment collection
	WG: 1, // WG ballot
	SA: 2, // SA ballot
	Motion: 5, // motion
};

export const BallotTypeLabels = {
	[BallotType.CC]: "CC",
	[BallotType.WG]: "LB",
	[BallotType.SA]: "SA",
	[BallotType.Motion]: "Motion",
};

export function getBallotId(ballot: Ballot) {
	return BallotTypeLabels[ballot.Type] + (ballot.number || "(Blank)");
}

export type BallotSeries = {
	id: number;
	ballotIds: number[];
	votingPoolId: number;
	start: string;
	end: string;
};

type SyncedBallotSeries = BallotSeries & {
	ballotNames: string[];
	project: string;
};

export type BallotSeriesParticipationSummary = {
	SAPIN: number; // Current SAPIN
	series_id: number; // Ballot series identifier
	voterSAPIN: number; // SAPIN in voting pool
	voter_id: string; // Voter identifier in voting pool
	excused: boolean; // Excused from participation (recorded in voting pool)
	vote: string | null; // Last vote
	lastSAPIN: number | null; // SAPIN used for last vote
	lastBallotId: number | null; // Ballot for last vote
	commentCount: number | null; // Number of comments submitted with last vote
	totalCommentCount: number | null; // Total comments over ballot series
};

export type RecentBallotSeriesParticipation = {
	SAPIN: number;
	ballotSeriesParticipationSummaries: BallotSeriesParticipationSummary[];
};

export type MemberParticipation = RecentBallotSeriesParticipation & {
	Name: string;
	Email: string;
	Employer: string;
	Affiliation: string;
	Status: StatusType | "New";
	ExpectedStatus: ExpectedStatusType;
	Summary: string;
};

const ballotSeriesAdapter = createEntityAdapter<BallotSeries>();
const ballotsAdapter = createEntityAdapter<Ballot>();
const initialState = {
	ballotSeries: ballotSeriesAdapter.getInitialState(),
	ballots: ballotsAdapter.getInitialState(),
	groupName: null as string | null,
	lastLoad: null as string | null,
};

const selectId = (entity: RecentBallotSeriesParticipation) => entity.SAPIN;
const dataSet = "ballotParticipation";
const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	selectId,
	initialState,
	reducers: {
		setBallotSeries(state, action: PayloadAction<BallotSeries[]>) {
			ballotSeriesAdapter.setAll(state.ballotSeries, action.payload);
		},
		setBallots(state, action: PayloadAction<Ballot[]>) {
			ballotsAdapter.setAll(state.ballots, action.payload);
		},
	},
	extraReducers: (builder, dataAdapter) => {
		builder
			.addMatcher(
				(action: Action) => action.type === getPending.toString(),
				(state, action: ReturnType<typeof getPending>) => {
					const { groupName } = action.payload;
					if (groupName !== state.groupName) {
						dataAdapter.removeAll(state);
						state.valid = false;
					}
					state.lastLoad = new Date().toISOString();
					state.groupName = groupName;
				}
			)
			.addMatcher(
				(action: Action) =>
					action.type === clearBallotParticipation.toString(),
				(state) => {
					dataAdapter.removeAll(state);
					state.valid = false;
					state.lastLoad = null;
					state.groupName = null;
				}
			);
	},
});

export default slice;

/* Slice actions */
const {
	getSuccess,
	getFailure,
	setBallotSeries,
	setBallots,
	setOne,
	setSelected,
} = slice.actions;

// Overload getPending() with one that sets groupName
const getPending = createAction<{ groupName: string }>(dataSet + "/getPending");
export const clearBallotParticipation = createAction(dataSet + "/clear");

export const ballotParticipationActions = slice.actions;
export { setSelected };

/*
 * Selectors
 */
export const selectBallotParticipationState = (state: RootState) =>
	state[dataSet];
const selectBallotParticipationAge = (state: RootState) => {
	const lastLoad = selectBallotParticipationState(state).lastLoad;
	if (!lastLoad) return NaN;
	return new Date().valueOf() - new Date(lastLoad).valueOf();
};
export const selectBallotParticipationIds = (state: RootState) =>
	selectBallotParticipationState(state).ids;
export const selectBallotParticipationEntities = (state: RootState) =>
	selectBallotParticipationState(state).entities;

export const selectBallotSeries = (state: RootState) =>
	selectBallotParticipationState(state).ballotSeries;
export const selectBallotSeriesIds = (state: RootState) =>
	selectBallotSeries(state).ids;
export const selectBallotSeriesEntities = (state: RootState) =>
	selectBallotSeries(state).entities;

export const selectBallotIds = (state: RootState) =>
	selectBallotParticipationState(state).ballots.ids;
export const selectBallotEntities = (state: RootState) =>
	selectBallotParticipationState(state).ballots.entities;

export const selectMostRecentBallotSeries = (state: RootState) => {
	const ballotSeries = selectRecentBallotSeries(state);
	return ballotSeries[ballotSeries.length - 1];
};

export const selectSyncedBallotSeriesEntities = createSelector(
	selectBallotEntities,
	selectBallotSeriesEntities,
	(ballotEntities, ballotSeriesEntities) => {
		const syncedBallotSeriesEntities: Record<EntityId, SyncedBallotSeries> =
			{};
		Object.values(ballotSeriesEntities).forEach((entity) => {
			const ballotNames = entity!.ballotIds.map((id) => {
				const ballot = ballotEntities[id];
				return ballot ? getBallotId(ballot) : "Unknown";
			});
			const project = ballotEntities[entity!.id]?.Project || "Unknown";
			const newEntity: SyncedBallotSeries = {
				...entity!,
				project,
				ballotNames,
			};
			syncedBallotSeriesEntities[entity!.id] = newEntity;
		});
		return syncedBallotSeriesEntities;
	}
);

export const selectRecentBallotSeries = createSelector(
	selectBallotSeriesIds,
	selectSyncedBallotSeriesEntities,
	(ids, entities) => ids.map((id) => entities[id as number]!)
);

export function memberBallotParticipationCount(
	member: Member,
	ballotSeriesParticipationSummaries: BallotSeriesParticipationSummary[],
	ballotSeriesEntities: Dictionary<BallotSeries>
) {
	// Only care about ballots since becoming a Voter
	// (a member may have lost voting status and we don't want participation from that time affecting the result)
	const h = member.StatusChangeHistory.find(
		(h) => h.NewStatus === "Voter" && h.OldStatus !== "Voter"
	);
	if (h && h.Date)
		ballotSeriesParticipationSummaries =
			ballotSeriesParticipationSummaries.filter(
				(s) =>
					DateTime.fromISO(ballotSeriesEntities[s.series_id]!.start) >
					DateTime.fromISO(h.Date!)
			);

	const count = ballotSeriesParticipationSummaries.reduce(
		(count, participation) =>
			participation.vote || participation.excused ? count + 1 : count,
		0
	);
	return {
		count,
		total: ballotSeriesParticipationSummaries.length,
	};
}

function memberExpectedStatusFromBallotParticipation(
	member: Member,
	count: number,
	total: number
) {
	// A status change won't happen if a status override is in effect or if the member is not a voter
	if (member.StatusChangeOverride || member.Status !== "Voter") return "";

	if (total >= 3 && count < 2) return "Non-Voter";

	return "";
}

export const selectBallotParticipationWithMembershipAndSummary = createSelector(
	selectMemberEntities,
	selectBallotSeriesEntities,
	selectBallotParticipationIds,
	selectBallotParticipationEntities,
	(memberEntities, ballotSeriesEntities, ids, entities) => {
		const newEntities: Record<EntityId, MemberParticipation> = {};
		ids.forEach((id) => {
			const entity = entities[id]!;
			const member = memberEntities[entity.SAPIN];
			let expectedStatus: ExpectedStatusType = "";
			let summary = "";
			if (member) {
				const { count, total } = memberBallotParticipationCount(
					member,
					entity.ballotSeriesParticipationSummaries,
					ballotSeriesEntities
				);
				expectedStatus = memberExpectedStatusFromBallotParticipation(
					member,
					count,
					total
				);
				summary = `${count}/${total}`;
			}
			newEntities[id] = {
				...entity,
				Name: member ? member.Name : "",
				Email: member ? member.Email : "",
				Affiliation: member ? member.Affiliation : "",
				Employer: member ? member.Employer : "",
				Status: member ? member.Status : "New",
				ExpectedStatus: expectedStatus,
				Summary: summary,
			};
		});
		return newEntities;
	}
);

export const selectMemberBallotParticipationCount = createSelector(
	selectBallotParticipationEntities,
	selectBallotSeriesEntities,
	selectMemberEntities,
	(state: RootState, SAPIN: number) => SAPIN,
	(
		ballotParticipationEntities,
		ballotSeriesEntities,
		memberEntities,
		SAPIN
	) => {
		const summaries: BallotSeriesParticipationSummary[] =
			ballotParticipationEntities[SAPIN]
				?.ballotSeriesParticipationSummaries || [];
		const member = memberEntities[SAPIN];
		if (member)
			return memberBallotParticipationCount(
				member,
				summaries,
				ballotSeriesEntities
			);
		return { count: 0, total: 0 };
	}
);

function getField(entity: MemberParticipation, dataKey: string) {
	const m = /ballotSeries_(\d+)/.exec(dataKey);
	if (m) {
		const i = Number(m[1]);
		const summary = entity.ballotSeriesParticipationSummaries[i];
		if (!summary) return "Not in pool";
		if (!summary.vote) return "Did not vote";
		return summary.vote;
	}
	return entity[dataKey as keyof MemberParticipation];
}

export const ballotParticipationSelectors = getAppTableDataSelectors(
	selectBallotParticipationState,
	{
		selectEntities: selectBallotParticipationWithMembershipAndSummary,
		getField,
	}
);

/*
 * Thunk actions
 */
function validResponse(response: any): response is {
	ballots: Ballot[];
	ballotSeries: BallotSeries[];
	ballotSeriesParticipation: RecentBallotSeriesParticipation[];
} {
	return (
		isObject(response) &&
		Array.isArray(response.ballots) &&
		Array.isArray(response.ballotSeries) &&
		Array.isArray(response.ballotSeriesParticipation)
	);
}

const AGE_STALE = 60 * 60 * 1000; // 1 hour

let loading = false;
let loadingPromise: Promise<void> = Promise.resolve();
export const loadBallotParticipation =
	(groupName: string, force = false): AppThunk<void> =>
	(dispatch, getState) => {
		const state = getState();
		const currentGroupName =
			selectBallotParticipationState(state).groupName;
		if (currentGroupName === groupName) {
			if (loading) return loadingPromise;
			const age = selectBallotParticipationAge(state);
			if (!force && age && age < AGE_STALE) return loadingPromise;
		}
		dispatch(getPending({ groupName }));
		const url = `/api/${groupName}/ballotParticipation`;
		loading = true;
		loadingPromise = fetcher
			.get(url)
			.then((response) => {
				if (!validResponse(response))
					throw new TypeError("Unexpected response to GET " + url);
				dispatch(setBallots(response.ballots));
				dispatch(setBallotSeries(response.ballotSeries));
				dispatch(getSuccess(response.ballotSeriesParticipation));
			})
			.catch((error) => {
				dispatch(getFailure());
				dispatch(
					setError(`Unable to get ballot series participation`, error)
				);
			})
			.finally(() => {
				loading = false;
			});
		return loadingPromise;
	};

export type BallotParticipationUpdate = {
	id: number;
	changes: Partial<BallotSeriesParticipationSummary>;
};

export const updateBallotParticipation =
	(sapin: number, updates: BallotParticipationUpdate[]): AppThunk =>
	async (dispatch, getState) => {
		const entities = selectBallotParticipationEntities(getState());
		const entity = entities[sapin];
		if (!entity) {
			console.error(`Entry for ${sapin} does not exist`);
			return;
		}
		const voterUpdates: Record<
			number,
			{ id: string; changes: { Excused: boolean } }[]
		> = {};
		const updatedSummaries = entity.ballotSeriesParticipationSummaries.map(
			(summary) => {
				const update = updates.find((u) => u.id === summary.series_id);
				if (!update) return summary;
				const { changes } = update;
				if ("excused" in changes) {
					const update = {
						id: summary.voter_id,
						changes: { Excused: changes.excused! },
					};
					if (voterUpdates[summary.series_id])
						voterUpdates[summary.series_id].push(update);
					else voterUpdates[summary.series_id] = [update];
				}
				return { ...summary, ...changes };
			}
		);
		Object.entries(voterUpdates).forEach(([ballot_id, updates]) => {
			const url = `/api/voters/${ballot_id}`;
			fetcher
				.patch(url, updates)
				.catch((error) =>
					dispatch(setError("Unable to update voters", error))
				);
		});
		dispatch(
			setOne({
				SAPIN: sapin,
				ballotSeriesParticipationSummaries: updatedSummaries,
			})
		);
	};
