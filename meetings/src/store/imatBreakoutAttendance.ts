import { createAction } from "@reduxjs/toolkit";

import {
	fetcher,
	setError,
	createAppTableDataSlice,
	getAppTableDataSelectors,
	FieldType,
	isObject,
	Fields,
} from "dot11-components";

import type { AppThunk, RootState } from ".";
import { selectImatMeetingEntities } from "./imatMeetings";
import {
	selectBreakoutMeetingId,
	selectBreakoutEntities,
} from "./imatBreakouts";

export type ImatBreakoutAttendance = {
	SAPIN: number;
	Name: string;
	Email: string;
	Affiliation: string;
	Timestamp: string;
};

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
};

const initialState: ExtraState = {
	groupName: null,
	imatMeetingId: null,
	imatBreakoutId: null,
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

/* Actions */
function validImatBreakoutAttendance(a: any): a is ImatBreakoutAttendance {
	return (
		isObject(a) &&
		typeof a.SAPIN === "number" &&
		typeof a.Name === "string" &&
		typeof a.Affiliation === "string"
	);
}

function validResponse(response: any): response is ImatBreakoutAttendance[] {
	return (
		Array.isArray(response) && response.every(validImatBreakoutAttendance)
	);
}

let loadingPromise: Promise<ImatBreakoutAttendance[]>;
export const loadBreakoutAttendance =
	(
		groupName: string,
		imatMeetingId: number,
		imatBreakoutId: number
	): AppThunk<ImatBreakoutAttendance[]> =>
	async (dispatch, getState) => {
		const { loading, ...current } = selectBreakoutAttendanceState(
			getState()
		);
		if (
			loading &&
			groupName === current.groupName &&
			imatMeetingId === current.imatMeetingId &&
			imatBreakoutId === current.imatBreakoutId
		) {
			return loadingPromise;
		}
		dispatch(getPending({ groupName, imatMeetingId, imatBreakoutId }));
		loadingPromise = fetcher
			.get(
				`/api/${groupName}/imat/attendance/${imatMeetingId}/${imatBreakoutId}`
			)
			.then((response: any) => {
				if (!validResponse(response))
					throw new TypeError("Unexpected response");
				dispatch(getSuccess(response));
				return response;
			})
			.catch((error: any) => {
				dispatch(getFailure());
				dispatch(
					setError(
						`Unable to get attendance for ${imatMeetingId}/${imatBreakoutId}`,
						error
					)
				);
				return [];
			});
		return loadingPromise;
	};
