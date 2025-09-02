import {
	createAction,
	Action,
	EntityId,
	createSelector,
} from "@reduxjs/toolkit";

import { fetcher } from "@common";
import {
	setError,
	createAppTableDataSlice,
	Fields,
	FieldType,
	getAppTableDataSelectors,
} from "@common";

import type { RootState, AppThunk } from ".";
import {
	AffiliationMap,
	AffiliationMapCreate,
	AffiliationMapUpdate,
	affiliationMapsSchema,
} from "@schemas/affiliationMap";
export type { AffiliationMap, AffiliationMapCreate, AffiliationMapUpdate };

export const fields: Fields = {
	id: { label: "id", type: FieldType.NUMERIC },
	match: { label: "Match", type: FieldType.STRING },
	shortAffiliation: { label: "Name" },
};

const initialState: {
	groupName: string | null;
	lastLoad: string | null;
} = {
	groupName: null,
	lastLoad: null,
};

const selectId = (a: AffiliationMap) => a.id;

const dataSet = "affiliationMap";
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
			}
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

export const affiliationMapActions = slice.actions;

/** Selectors */
export const selectAffiliationMapState = (state: RootState) => state[dataSet];

export const selectAffiliationMapIds = (state: RootState) =>
	selectAffiliationMapState(state).ids;
export const selectAffiliationMapEntities = (state: RootState) =>
	selectAffiliationMapState(state).entities;
const selectAffiliationMapAge = (state: RootState) => {
	const lastLoad = selectAffiliationMapState(state).lastLoad;
	if (!lastLoad) return NaN;
	return new Date().valueOf() - new Date(lastLoad).valueOf();
};

export const affiliationMapSelectors = getAppTableDataSelectors(
	selectAffiliationMapState
);

export const selectAffiliationMaps = createSelector(
	selectAffiliationMapIds,
	selectAffiliationMapEntities,
	(ids, entities) => ids.map((id) => entities[id]!)
);

/** Thunk actions */
const AGE_STALE = 60 * 60 * 1000; // 1 hour

let loading = false;
let loadingPromise: Promise<void> = Promise.resolve();
export const loadAffiliationMap =
	(groupName: string, force = false): AppThunk<void> =>
	(dispatch, getState) => {
		const state = getState();
		const currentGroupName = selectAffiliationMapState(state).groupName;
		if (currentGroupName === groupName) {
			if (loading) return loadingPromise;
			const age = selectAffiliationMapAge(state);
			if (!force && age && age < AGE_STALE) return loadingPromise;
		}

		dispatch(getPending({ groupName }));
		const url = `/api/${groupName}/affiliationMap`;
		loading = true;
		loadingPromise = fetcher
			.get(url)
			.then((response) => {
				const affiliationMaps = affiliationMapsSchema.parse(response);
				dispatch(getSuccess(affiliationMaps));
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

export const addAffiliationMaps =
	(adds: AffiliationMapCreate[]): AppThunk<AffiliationMap[]> =>
	(dispatch, getState) => {
		const { groupName } = selectAffiliationMapState(getState());
		const url = `/api/${groupName}/affiliationMap`;
		return fetcher
			.post(url, adds)
			.then((response) => {
				const affiliationMaps = affiliationMapsSchema.parse(response);
				dispatch(addMany(affiliationMaps));
				return affiliationMaps;
			})
			.catch((error) => {
				dispatch(setError("POST " + url, error));
				return [];
			});
	};

export const updateAffiliationMaps =
	(updates: AffiliationMapUpdate[]): AppThunk<void> =>
	(dispatch, getState) => {
		const { groupName } = selectAffiliationMapState(getState());
		const url = `/api/${groupName}/affiliationMap`;
		return fetcher
			.patch(url, updates)
			.then((response) => {
				const affiliationMaps = affiliationMapsSchema.parse(response);
				dispatch(setMany(affiliationMaps));
			})
			.catch((error) => {
				dispatch(setError("PATCH " + url, error));
			});
	};

export const deleteAffiliationMaps =
	(ids: EntityId[]): AppThunk<void> =>
	(dispatch, getState) => {
		const { groupName } = selectAffiliationMapState(getState());
		const url = `/api/${groupName}/affiliationMap`;
		return fetcher
			.delete(url, ids)
			.then(() => {
				dispatch(removeMany(ids));
			})
			.catch((error: unknown) => {
				dispatch(setError("DELETE " + url, error));
			});
	};
