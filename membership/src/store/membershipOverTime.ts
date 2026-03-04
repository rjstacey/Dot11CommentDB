import { createAction, createSelector, type Action } from "@reduxjs/toolkit";

import { fetcher } from "@common";
import {
	createAppTableDataSlice,
	Fields,
	FieldType,
	getAppTableDataSelectors,
} from "@common";

import type { RootState, AppThunk } from ".";
import { setError } from ".";
import {
	MembershipEvent,
	MembershipEventCreate,
	MembershipEventUpdate,
	membershipEventsSchema,
} from "@schemas/membershipOverTime";
export type { MembershipEvent, MembershipEventCreate, MembershipEventUpdate };

export const fields: Fields = {
	id: { label: "id", type: FieldType.NUMERIC },
	date: { label: "Date", type: FieldType.DATE },
	count: { label: "Count", type: FieldType.NUMERIC },
	note: { label: "Note", type: FieldType.STRING },
};

const initialState: {
	groupName: string | null;
	lastLoad: string | null;
} = {
	groupName: null,
	lastLoad: null,
};

const selectId = (a: MembershipEvent) => a.id;

const dataSet = "membershipOverTime";
const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	selectId,
	initialState,
	reducers: {},
	extraReducers: (builder, dataAdapter) => {
		builder.addMatcher(
			(action: Action) => action.type === getPending.toString(),
			(state, action: ReturnType<typeof getPending>) => {
				const { groupName } = action.payload;
				state.lastLoad = new Date().toISOString();
				if (groupName !== state.groupName) {
					dataAdapter.removeAll(state);
					state.valid = false;
				}
				state.groupName = groupName;
			},
		);
	},
});
export default slice;

/** Slice actions */
const { getSuccess, getFailure, addMany, setMany, removeMany, setSelected } =
	slice.actions;
export { setSelected };

// Overload getPending() with one that sets groupName
const getPending = createAction<{ groupName: string }>(dataSet + "/getPending");

export const membershipOverTimeActions = slice.actions;

/** Selectors */
export const selectMembershipOverTimeState = (state: RootState) =>
	state[dataSet];

export const selectMembershipOverTimeIds = (state: RootState) =>
	selectMembershipOverTimeState(state).ids;
export const selectMembershipOverTimeEntities = (state: RootState) =>
	selectMembershipOverTimeState(state).entities;
const selectMembershipOverTimeAge = (state: RootState) => {
	const lastLoad = selectMembershipOverTimeState(state).lastLoad;
	if (!lastLoad) return NaN;
	return new Date().valueOf() - new Date(lastLoad).valueOf();
};

export const membershipOverTimeSelectors = getAppTableDataSelectors(
	selectMembershipOverTimeState,
);

export const selectMembershipOverTime = createSelector(
	selectMembershipOverTimeIds,
	selectMembershipOverTimeEntities,
	(ids, entities) => ids.map((id) => entities[id]!),
);

/** Thunk actions */
const AGE_STALE = 60 * 60 * 1000; // 1 hour

let loading = false;
let loadingPromise: Promise<void> = Promise.resolve();
export const loadMembershipOverTime =
	(groupName: string, force = false): AppThunk<void> =>
	(dispatch, getState) => {
		const state = getState();
		const currentGroupName = selectMembershipOverTimeState(state).groupName;
		if (currentGroupName === groupName) {
			if (loading) return loadingPromise;
			const age = selectMembershipOverTimeAge(state);
			if (!force && age && age < AGE_STALE) return loadingPromise;
		}

		dispatch(getPending({ groupName }));
		const url = `/api/${groupName}/membershipOverTime`;
		loading = true;
		loadingPromise = fetcher
			.get(url)
			.then((response) => {
				const membershipOverTime =
					membershipEventsSchema.parse(response);
				dispatch(getSuccess(membershipOverTime));
			})
			.catch((error) => {
				dispatch(getFailure());
				dispatch(setError("GET " + url, error));
			})
			.finally(() => {
				loading = false;
			});

		return loadingPromise;
	};

export const addMembershipOverTime =
	(adds: MembershipEventCreate[]): AppThunk<MembershipEvent[]> =>
	(dispatch, getState) => {
		const { groupName } = selectMembershipOverTimeState(getState());
		const url = `/api/${groupName}/membershipOverTime`;
		return fetcher
			.post(url, adds)
			.then((response) => {
				const membershipOverTime =
					membershipEventsSchema.parse(response);
				dispatch(addMany(membershipOverTime));
				return membershipOverTime;
			})
			.catch((error) => {
				dispatch(setError("POST " + url, error));
				return [];
			});
	};

export const updateMembershipOverTime =
	(updates: MembershipEventUpdate[]): AppThunk<void> =>
	(dispatch, getState) => {
		const { groupName } = selectMembershipOverTimeState(getState());
		const url = `/api/${groupName}/membershipOverTime`;
		return fetcher
			.patch(url, updates)
			.then((response) => {
				const membershipOverTime =
					membershipEventsSchema.parse(response);
				dispatch(setMany(membershipOverTime));
			})
			.catch((error) => {
				dispatch(setError("PATCH " + url, error));
			});
	};

export const deleteMembershipOverTime =
	(ids: number[]): AppThunk<void> =>
	(dispatch, getState) => {
		const { groupName } = selectMembershipOverTimeState(getState());
		const url = `/api/${groupName}/membershipOverTime`;
		return fetcher
			.delete(url, ids)
			.then(() => {
				dispatch(removeMany(ids));
			})
			.catch((error: unknown) => {
				dispatch(setError("DELETE " + url, error));
			});
	};
