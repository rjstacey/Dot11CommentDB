import { createSelector, createAction } from "@reduxjs/toolkit";
import type { Dictionary, Action } from "@reduxjs/toolkit";
import {
	fetcher,
	setError,
	createAppTableDataSlice,
	displayDate,
	getAppTableDataSelectors,
	FieldType,
	Fields,
} from "@common";

import type { RootState, AppThunk } from ".";
import { selectBallotEntities as selectSyncedBallotEntities } from "./ballots";
import { Epoll, epollsSchema } from "@schemas/epolls";

export type { Epoll };

export type SyncedEpoll = Epoll & { InDatabase: boolean };

export const fields: Fields = {
	id: { label: "ePoll", type: FieldType.NUMERIC },
	name: { label: "Name" },
	start: { label: "Start", dataRenderer: displayDate, type: FieldType.DATE },
	end: { label: "End", dataRenderer: displayDate, type: FieldType.DATE },
	document: { label: "Document" },
	topic: { label: "Topic" },
	resultsSummary: { label: "Result", type: FieldType.NUMERIC },
};

const initialState = {
	groupName: null as string | null,
	n: 20,
	lastLoad: null as string | null,
};
const dataSet = "epolls";
const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	initialState,
	selectId: (d: Epoll) => d.id,
	reducers: {},
	extraReducers: (builder, dataAdapter) => {
		builder
			.addMatcher(
				(action: Action) => action.type === getPending.toString(),
				(state, action: ReturnType<typeof getPending>) => {
					const { groupName, n } = action.payload;
					state.lastLoad = new Date().toISOString();
					state.n = n;
					if (groupName !== state.groupName) {
						state.groupName = groupName;
						state.valid = false;
						dataAdapter.removeAll(state);
					}
				}
			)
			.addMatcher(
				(action: Action) => action.type === clearEpolls.toString(),
				(state) => {
					dataAdapter.removeAll(state);
					state.valid = false;
				}
			);
	},
});

export default slice;

/* Slice actions */
// Overload getPending() with one that sets groupName
const getPending = createAction<{ groupName: string | null; n: number }>(
	dataSet + "/getPending"
);
const { getSuccess, getFailure } = slice.actions;

export const clearEpolls = createAction(dataSet + "/clear");
export const epollsActions = slice.actions;

/* Selectors */
export const selectEpollsState = (state: RootState) => state[dataSet];
const selectEpollsAge = (state: RootState) => {
	const lastLoad = selectEpollsState(state).lastLoad;
	if (!lastLoad) return NaN;
	return new Date().valueOf() - new Date(lastLoad).valueOf();
};
export const selectEpollIds = (state: RootState) =>
	selectEpollsState(state).ids;
export const selectEpollEntities = (state: RootState) =>
	selectEpollsState(state).entities;

/** Generate epoll entities with indicator on each entry for presence in the ballots list */
export const selectSyncedEntities = createSelector(
	selectSyncedBallotEntities,
	selectEpollEntities,
	(ballotEntities, epollEntities) => {
		const syncedEntities: Dictionary<SyncedEpoll> = {};
		for (const id of Object.keys(epollEntities))
			syncedEntities[id] = { ...epollEntities[id]!, InDatabase: false };
		for (const b of Object.values(ballotEntities)) {
			if (b!.EpollNum && syncedEntities[b!.EpollNum])
				syncedEntities[b!.EpollNum]!.InDatabase = true;
		}
		return syncedEntities;
	}
);

export const epollsSelectors = getAppTableDataSelectors(selectEpollsState, {
	selectEntities: selectSyncedEntities,
});

/* Thunk actions */
const AGE_STALE = 60 * 60 * 1000; // 1 hour
let loading = false;
let loadingPromise: Promise<void>;
export const loadEpolls =
	(groupName: string, n = 20, force = false): AppThunk<void> =>
	(dispatch, getState) => {
		const state = getState();
		const current = selectEpollsState(state);
		if (groupName === current.groupName && n === current.n) {
			if (loading) return loadingPromise;
			const age = selectEpollsAge(state);
			if (!force && age && age < AGE_STALE) return Promise.resolve();
		}
		dispatch(getPending({ groupName, n }));
		const url = `/api/${groupName}/epolls`;
		loading = true;
		loadingPromise = fetcher
			.get(url, { n })
			.then((response: unknown) => {
				const epolls = epollsSchema.parse(response);
				dispatch(getSuccess(epolls));
			})
			.catch((error: unknown) => {
				dispatch(getFailure());
				dispatch(setError("GET " + url, error));
			})
			.finally(() => {
				loading = false;
			});
		return loadingPromise;
	};

export const loadMoreEpolls = (): AppThunk => (dispatch, getState) => {
	const { groupName, n } = selectEpollsState(getState());
	if (!groupName) return Promise.resolve();
	return dispatch(loadEpolls(groupName, n + 20));
};

export const refreshEpolls = (): AppThunk => (dispatch, getState) => {
	const { groupName, n } = selectEpollsState(getState());
	if (!groupName) return Promise.resolve();
	return dispatch(loadEpolls(groupName, n, true));
};
