import {
	createAction,
	Action,
	EntityId,
	createSelector,
} from "@reduxjs/toolkit";

import {
	fetcher,
	setError,
	createAppTableDataSlice,
	FieldType,
	isObject,
	getAppTableDataSelectors,
} from "dot11-components";

import type { RootState, AppThunk } from ".";

export type AffiliationMap = {
	id: number;
	match: string;
	shortAffiliation: string;
};

export type AffiliationMapCreate = Omit<AffiliationMap, "id">;

export type AffiliationMapUpdate = {
	id: number;
	changes: Partial<AffiliationMap>;
};

export const fields = {
	id: { label: "id", type: FieldType.NUMERIC },
	match: { label: "Match", type: FieldType.STRING },
	shortAffiliation: { label: "Name" },
};

const initialState = {
	groupName: null as string | null,
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

/* Slice actions */
const { getSuccess, getFailure, addMany, setMany, removeMany, setSelected } =
	slice.actions;
export { setSelected };

// Overload getPending() with one that sets groupName
const getPending = createAction<{ groupName: string }>(dataSet + "/getPending");

export const affiliationMapActions = slice.actions;

/*
 * Selectors
 */
export const selectAffiliationMapState = (state: RootState) => state[dataSet];

export const selectAffiliationMapIds = (state: RootState) =>
	selectAffiliationMapState(state).ids;
export const selectAffiliationMapEntities = (state: RootState) =>
	selectAffiliationMapState(state).entities;

export const affiliationMapSelectors = getAppTableDataSelectors(
	selectAffiliationMapState
);

export const selectAffiliationMaps = createSelector(
	selectAffiliationMapIds,
	selectAffiliationMapEntities,
	(ids, entities) => ids.map((id) => entities[id]!)
);

/*
 * Thunk actions
 */
function validResponse(response: any): response is AffiliationMap[] {
	return Array.isArray(response) && response.every(isObject);
}

let loadingPromise: Promise<AffiliationMap[]>;
export const loadAffiliationMap =
	(groupName: string): AppThunk<AffiliationMap[]> =>
	(dispatch, getState) => {
		const { loading, groupName: currentGroupName } =
			selectAffiliationMapState(getState());
		if (loading && currentGroupName === groupName) {
			return loadingPromise;
		}
		dispatch(getPending({ groupName }));
		const url = `/api/${groupName}/affiliationMap`;
		loadingPromise = fetcher
			.get(url)
			.then((response: any) => {
				if (!validResponse(response))
					throw new TypeError("Unexpected response to GET " + url);
				dispatch(getSuccess(response));
				return response;
			})
			.catch((error: any) => {
				dispatch(getFailure());
				dispatch(
					setError(`Unable to get ballot series participation`, error)
				);
				return [];
			});
		return loadingPromise;
	};

export const addAffiliationMaps =
	(adds: AffiliationMapCreate[]): AppThunk<AffiliationMap[] | undefined> =>
	(dispatch, getState) => {
		const { groupName } = selectAffiliationMapState(getState());
		const url = `/api/${groupName}/affiliationMap`;
		return fetcher
			.post(url, adds)
			.then((response: any) => {
				if (!validResponse(response))
					throw new TypeError(`Unexpected response to POST ${url}`);
				dispatch(addMany(response));
				return response;
			})
			.catch((error: any) => {
				dispatch(setError("Unable to add affiliation map", error));
			});
	};

export const updateAffiliationMaps =
	(updates: AffiliationMapUpdate[]): AppThunk<AffiliationMap[] | undefined> =>
	(dispatch, getState) => {
		const { groupName } = selectAffiliationMapState(getState());
		const url = `/api/${groupName}/affiliationMap`;
		return fetcher
			.patch(url, updates)
			.then((response: any) => {
				if (!validResponse(response))
					throw new TypeError(`Unexpected response to POST ${url}`);
				dispatch(setMany(response));
				return response;
			})
			.catch((error: any) => {
				dispatch(setError("Unable to update officer", error));
			});
	};

export const deleteAffiliationMaps =
	(ids: EntityId[]): AppThunk =>
	(dispatch, getState) => {
		const { groupName } = selectAffiliationMapState(getState());
		const url = `/api/${groupName}/affiliationMap`;
		return fetcher
			.delete(url, ids)
			.then(() => {
				dispatch(removeMany(ids));
			})
			.catch((error: any) => {
				dispatch(setError("Unable to delete officer", error));
			});
	};
