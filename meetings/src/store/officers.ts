import {
	createSlice,
	createEntityAdapter,
	createSelector,
	PayloadAction,
} from "@reduxjs/toolkit";
import type { EntityId } from "@reduxjs/toolkit";

import { fetcher, setError } from "dot11-components";

import type { RootState, AppThunk } from ".";

export type OfficerId = string;
export type Officer = {
	id: OfficerId;
	sapin: number;
	position: string;
	group_id: string;
};

type ExtraState = {
	valid: boolean;
	loading: boolean;
	groupName: string | null;
};

const dataAdapter = createEntityAdapter<Officer>({});
const initialState = dataAdapter.getInitialState<ExtraState>({
	valid: false,
	loading: false,
	groupName: null,
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
		},
	},
});

export default slice;

/*
 * Selectors
 */
export const selectOfficersState = (state: RootState) => state[dataSet];

export function selectGroupOfficers(state: OfficersState, group_id: EntityId) {
	const { ids, entities } = state;
	return ids
		.filter((id) => entities[id]!.group_id === group_id)
		.map((id) => entities[id]!);
}

export const createGroupOfficersSelector = (
	state: RootState,
	group_id: EntityId
) => createSelector(selectOfficersState, () => group_id, selectGroupOfficers);

/*
 * Actions
 */
const { getPending, getSuccess, getFailure } = slice.actions;

export const loadOfficers =
	(groupName: string): AppThunk =>
	(dispatch) => {
		const url = `/api/${groupName}/officers`;
		dispatch(getPending({ groupName }));
		return fetcher
			.get(url)
			.then((officers: any) => {
				if (!Array.isArray(officers))
					throw new TypeError(`Unexpected response to GET ${url}`);
				dispatch(getSuccess(officers));
			})
			.catch((error: any) => {
				dispatch(getFailure());
				dispatch(setError("Unable to get groups", error));
			});
	};
