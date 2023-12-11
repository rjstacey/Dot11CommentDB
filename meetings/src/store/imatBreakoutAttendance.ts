import type { PayloadAction } from "@reduxjs/toolkit";

import {
	fetcher,
	setError,
	createAppTableDataSlice,
	getAppTableDataSelectors,
	FieldType,
	isObject,
} from "dot11-components";

import type { AppThunk, RootState } from ".";
import { selectWorkingGroupName } from "./groups";
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

export const fields = {
	SAPIN: { label: "SA PIN", type: FieldType.NUMERIC },
	Name: { label: "Name" },
	Email: { label: "Email" },
	Affiliation: { label: "Affiliation" },
	Timestamp: { label: "Timestamp", type: FieldType.DATE },
};

type ExtraState = {
	imatMeetingId: number;
	imatBreakoutId: number;
};

const initialState: ExtraState = {
	imatMeetingId: 0,
	imatBreakoutId: 0,
};

const selectId = (entity: ImatBreakoutAttendance) => entity.SAPIN;
const dataSet = "imatBreakoutAttendance";
const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	selectId,
	initialState,
	reducers: {
		setDetails(state, action: PayloadAction<ExtraState>) {
			return { ...state, ...action.payload };
		},
	},
});

export default slice;

/*
 * Selectors
 */
export const selectBreakoutAttendanceState = (state: RootState) =>
	state[dataSet];

export const selectImatMeeting = (state: RootState) => {
	const { imatMeetingId } = selectBreakoutAttendanceState(state);
	const imatMeetingEntities = selectImatMeetingEntities(state);
	return imatMeetingEntities[imatMeetingId];
};

export const selectImatBreakout = (state: RootState) => {
	const { imatMeetingId, imatBreakoutId } =
		selectBreakoutAttendanceState(state);
	if (imatMeetingId === selectBreakoutMeetingId(state)) {
		const imatBreakoutEntities = selectBreakoutEntities(state);
		return imatBreakoutEntities[imatBreakoutId];
	}
};

export const imatBreakoutAttendanceSelectors = getAppTableDataSelectors(
	selectBreakoutAttendanceState
);

/*
 * Actions
 */
export const imatBreakoutAttendanceActions = slice.actions;

const { getPending, getSuccess, getFailure, setDetails } = slice.actions;

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

export const loadBreakoutAttendance =
	(
		imatMeetingId: number,
		imatBreakoutId: number
	): AppThunk<ImatBreakoutAttendance[]> =>
	async (dispatch, getState) => {
		const groupName = selectWorkingGroupName(getState());
		const url = `/api/${groupName}/imat/attendance/${imatMeetingId}/${imatBreakoutId}`;
		dispatch(getPending());
		let response: any;
		try {
			response = await fetcher.get(url);
			if (!validResponse(response))
				throw new TypeError("Unexpected response");
		} catch (error) {
			dispatch(getFailure());
			dispatch(
				setError(
					`Unable to get attendance for ${imatMeetingId}/${imatBreakoutId}`,
					error
				)
			);
			return [];
		}
		dispatch(setDetails({ imatMeetingId, imatBreakoutId }));
		dispatch(getSuccess(response));
		return response;
	};
