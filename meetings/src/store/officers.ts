import {
	createSlice,
	createEntityAdapter,
	createSelector,
	PayloadAction,
} from "@reduxjs/toolkit";
import type { EntityId } from "@reduxjs/toolkit";

import { fetcher, setError } from "@common";

import type { RootState, AppThunk } from ".";
import { OfficerId, Officer, officersSchema } from "@schemas/officers";

export type { OfficerId, Officer };

type ExtraState = {
	valid: boolean;
	loading: boolean;
	groupName: string | null;
	lastLoad: string | null;
};

const dataAdapter = createEntityAdapter<Officer>({});
const initialState = dataAdapter.getInitialState<ExtraState>({
	valid: false,
	loading: false,
	groupName: null,
	lastLoad: null,
});

export type OfficersState = typeof initialState;

const dataSet = "officers";
const slice = createSlice({
	name: dataSet,
	initialState,
	reducers: {
		getPending(state, action: PayloadAction<{ groupName: string | null }>) {
			const { groupName } = action.payload;
			state.loading = true;
			state.lastLoad = new Date().toISOString();
			if (state.groupName !== groupName) {
				state.groupName = action.payload.groupName;
				state.valid = false;
				dataAdapter.removeAll(state);
			}
		},
		getSuccess(state, action) {
			state.loading = false;
			state.valid = true;
			dataAdapter.setAll(state, action.payload);
		},
		getFailure(state) {
			state.loading = false;
			state.lastLoad = null;
		},
	},
});

export default slice;

/* Slice actions */
const { getPending, getSuccess, getFailure } = slice.actions;

/* Selectors */
export const selectOfficersState = (state: RootState) => state[dataSet];
const selectOfficersAge = (state: RootState) => {
	const lastLoad = selectOfficersState(state).lastLoad;
	if (!lastLoad) return NaN;
	return new Date().valueOf() - new Date(lastLoad).valueOf();
};
export const selectOfficerIds = (state: RootState) =>
	selectOfficersState(state).ids;
export const selectOfficerEntities = (state: RootState) =>
	selectOfficersState(state).entities;
export function selectGroupOfficers(state: OfficersState, group_id: EntityId) {
	const { ids, entities } = state;
	return ids
		.filter((id) => entities[id]!.group_id === group_id)
		.map((id) => entities[id]!);
}
const selectOfficers = createSelector(
	selectOfficerIds,
	selectOfficerEntities,
	(ids, entities) => ids.map((id) => entities[id]!)
);

export const createGroupOfficersSelector = (
	state: RootState,
	group_id: EntityId
) => createSelector(selectOfficersState, () => group_id, selectGroupOfficers);

/* Thunk actions */
const AGE_STALE = 60 * 60 * 1000; // 1 hour
let loading = false;
let loadingPromise: Promise<Officer[]>;
export const loadOfficers =
	(groupName: string): AppThunk<Officer[]> =>
	(dispatch, getState) => {
		const state = getState();
		const { groupName: currentGroupName } = selectOfficersState(state);
		if (currentGroupName === groupName) {
			if (loading) return loadingPromise;
			const age = selectOfficersAge(state);
			if (age && age < AGE_STALE)
				return Promise.resolve(selectOfficers(state));
		}
		dispatch(getPending({ groupName }));
		const url = `/api/${groupName}/officers`;
		loading = true;
		loadingPromise = fetcher
			.get(url)
			.then((response: unknown) => {
				const officers = officersSchema.parse(response);
				dispatch(getSuccess(officers));
				return selectOfficers(getState());
			})
			.catch((error: unknown) => {
				dispatch(getFailure());
				dispatch(setError("GET " + url, error));
				return selectOfficers(getState());
			})
			.finally(() => {
				loading = false;
			});
		return loadingPromise;
	};
