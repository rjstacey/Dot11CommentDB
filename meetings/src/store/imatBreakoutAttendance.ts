import { createAction, createSelector } from "@reduxjs/toolkit";

import {
	fetcher,
	setError,
	createAppTableDataSlice,
	getAppTableDataSelectors,
	FieldType,
	Fields,
} from "@common";

import type { AppThunk, RootState } from ".";
import { selectImatMeetingEntities } from "./imatMeetings";
import {
	selectBreakoutMeetingId,
	selectBreakoutEntities,
} from "./imatBreakouts";
import {
	imatBreakoutAttendancesSchema,
	ImatBreakoutAttendance,
} from "@schemas/imat";

export type { ImatBreakoutAttendance };

export const fields: Fields = {
	SAPIN: { label: "SA PIN", type: FieldType.NUMERIC },
	Name: { label: "Name" },
	Email: { label: "Email" },
	Affiliation: { label: "Affiliation" },
	Timestamp: { label: "Timestamp", type: FieldType.DATE },
};

type ExtraState = {
	groupName: string | null;
	imatMeetingId: number | null;
	imatBreakoutId: number | null;
	lastLoad: string | null;
};

const initialState: ExtraState = {
	groupName: null,
	imatMeetingId: null,
	imatBreakoutId: null,
	lastLoad: null,
};

const selectId = (entity: ImatBreakoutAttendance) => entity.SAPIN;
const dataSet = "imatBreakoutAttendance";
const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	selectId,
	initialState,
	reducers: {},
	extraReducers(builder, dataAdapter) {
		builder
			.addMatcher(
				(action) => action.type === getPending.toString(),
				(state, action: ReturnType<typeof getPending>) => {
					const { groupName, imatMeetingId, imatBreakoutId } =
						action.payload;
					if (
						state.groupName !== groupName ||
						state.imatMeetingId !== imatMeetingId ||
						state.imatBreakoutId !== imatBreakoutId
					) {
						state.groupName = groupName;
						state.imatMeetingId = imatMeetingId;
						state.imatBreakoutId = imatBreakoutId;
						dataAdapter.removeAll(state);
					}
					state.lastLoad = new Date().toISOString();
				}
			)
			.addMatcher(
				(action) => action.type === clearBreakoutAttendance.toString(),
				(state) => {
					state.valid = false;
					state.groupName = null;
					state.imatMeetingId = null;
					state.imatBreakoutId = null;
					dataAdapter.removeAll(state);
				}
			);
	},
});

export default slice;

/* Slice actions */
export const imatBreakoutAttendanceActions = slice.actions;

const { getSuccess, getFailure } = slice.actions;

// Override the default getPending()
const getPending = createAction<{
	groupName: string;
	imatMeetingId: number;
	imatBreakoutId: number;
}>(dataSet + "/getPending");

export const clearBreakoutAttendance = createAction(dataSet + "/clear");

/* Selectors */
export const selectBreakoutAttendanceState = (state: RootState) =>
	state[dataSet];
const selectBreakoutAttendanceAge = (state: RootState) => {
	const lastLoad = selectBreakoutAttendanceState(state).lastLoad;
	if (!lastLoad) return NaN;
	return new Date().valueOf() - new Date(lastLoad).valueOf();
};
const selectBreakoutAttendanceIds = (state: RootState) =>
	selectBreakoutAttendanceState(state).ids;
const selectBreakoutAttendanceEntities = (state: RootState) =>
	selectBreakoutAttendanceState(state).entities;
export const selectImatBreakoutAttendances = createSelector(
	selectBreakoutAttendanceIds,
	selectBreakoutAttendanceEntities,
	(ids, entities) => ids.map((id) => entities[id]!)
);
export const selectImatMeeting = (state: RootState) => {
	const { imatMeetingId } = selectBreakoutAttendanceState(state);
	const imatMeetingEntities = selectImatMeetingEntities(state);
	return imatMeetingId ? imatMeetingEntities[imatMeetingId] : undefined;
};

export const selectImatBreakout = (state: RootState) => {
	const { imatMeetingId, imatBreakoutId } =
		selectBreakoutAttendanceState(state);
	if (imatMeetingId === selectBreakoutMeetingId(state)) {
		const imatBreakoutEntities = selectBreakoutEntities(state);
		return imatBreakoutId
			? imatBreakoutEntities[imatBreakoutId]
			: undefined;
	}
};

export const imatBreakoutAttendanceSelectors = getAppTableDataSelectors(
	selectBreakoutAttendanceState
);

/* Thunk actions */
const AGE_STALE = 60 * 60 * 1000; // 1 hour
let loading = false;
let loadingPromise: Promise<ImatBreakoutAttendance[]>;
export const loadBreakoutAttendance =
	(
		groupName: string,
		imatMeetingId: number,
		imatBreakoutId: number,
		force = false
	): AppThunk<ImatBreakoutAttendance[]> =>
	async (dispatch, getState) => {
		const state = getState();
		const current = selectBreakoutAttendanceState(state);
		if (
			groupName === current.groupName &&
			imatMeetingId === current.imatMeetingId &&
			imatBreakoutId === current.imatBreakoutId
		) {
			if (loading) return loadingPromise;
			const age = selectBreakoutAttendanceAge(state);
			if (!force && age && age < AGE_STALE)
				return Promise.resolve(selectImatBreakoutAttendances(state));
		}
		dispatch(getPending({ groupName, imatMeetingId, imatBreakoutId }));
		const url = `/api/${groupName}/imat/attendance/${imatMeetingId}/${imatBreakoutId}`;
		loadingPromise = fetcher
			.get(url)
			.then((response: unknown) => {
				const imatBreakoutAttendances =
					imatBreakoutAttendancesSchema.parse(response);
				dispatch(getSuccess(imatBreakoutAttendances));
				return selectImatBreakoutAttendances(getState());
			})
			.catch((error: unknown) => {
				dispatch(getFailure());
				dispatch(setError("GET " + url, error));
				return [];
			})
			.finally(() => {
				loading = false;
			});
		return loadingPromise;
	};
