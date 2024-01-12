import {
	createSelector,
	createAction,
	EntityId,
	PayloadAction,
} from "@reduxjs/toolkit";
import { DateTime } from "luxon";

import {
	fetcher,
	setError,
	isObject,
	createAppTableDataSlice,
	FieldType,
	getAppTableDataSelectors,
} from "dot11-components";

import type { AppThunk, RootState } from ".";
import { selectMeetingEntities } from "./meetings";
import { selectSyncedImatMeetingEntities } from "./imatMeetings";

export type Breakout = {
	id: number;
	name: string;
	location: string;
	day: number;

	groupId: number /** Committee identifier */;
	groupShortName?: string /** Committee short name */;
	symbol: string /** Committee sumbol */;

	start: string;
	startTime: string;
	startSlotId: number;

	end: string;
	endTime: string;
	endSlotId: number;

	credit: string;
	creditOverrideNumerator: number;
	creditOverrideDenominator: number;

	facilitator: string /** Facilitator email */;
};

export type Timeslot = {
	id: number;
	name: string;
	startTime: string;
	endTime: string;
};

type Committee = {
	id: number;
	parentId: string;
	type: string;
	symbol: string;
	shortName: string;
	name: string;
};

const displayGroup = (group: string) => {
	const parts = group.split("/");
	return parts[parts.length - 1];
};

export const fields = {
	id: { label: "Breakout ID", type: FieldType.NUMERIC },
	imatMeetingId: { label: "Meeting number", type: FieldType.NUMERIC },
	start: { label: "Start", type: FieldType.DATE },
	end: { label: "End", type: FieldType.DATE },
	weekDay: { label: "Day" },
	date: { label: "Date" },
	dayDate: { label: "Date" },
	timeRange: { label: "Time" },
	startTime: { label: "Start time" },
	endTime: { label: "End time" },
	location: { label: "Location" },
	symbol: { label: "Group", dataRenderer: displayGroup },
	name: { label: "Name" },
	credit: { label: "Credit" },
};

export const getField = (entity: Breakout, dataKey: string) => {
	if (dataKey === "weekDay")
		return DateTime.fromISO(entity.start, { setZone: true }).weekdayShort;
	if (dataKey === "date")
		return DateTime.fromISO(entity.start, { setZone: true }).toFormat(
			"dd LLL yyyy"
		);
	if (dataKey === "dayDate")
		return DateTime.fromISO(entity.start, { setZone: true }).toFormat(
			"EEE, d LLL yyyy"
		);
	if (dataKey === "startTime")
		return DateTime.fromISO(entity.start, { setZone: true }).toFormat(
			"HH:mm"
		);
	if (dataKey === "endTime")
		return DateTime.fromISO(entity.end, { setZone: true }).toFormat(
			"HH:mm"
		);
	if (dataKey === "timeRange")
		return (
			DateTime.fromISO(entity.start, { setZone: true }).toFormat(
				"HH:mm"
			) +
			"-" +
			DateTime.fromISO(entity.end, { setZone: true }).toFormat("HH:mm")
		);
	if (dataKey === "duration")
		return DateTime.fromISO(entity.end).diff(
			DateTime.fromISO(entity.start),
			"hours"
		).hours;
	return entity[dataKey as keyof Breakout];
};

//type ImatBreakoutsState = ExtraState & AppTableDataState<Breakout>;

const sortComparer = (a: Breakout, b: Breakout) => {
	// Sort by start
	const v1 =
		DateTime.fromISO(a.start).toMillis() -
		DateTime.fromISO(b.start).toMillis();
	if (v1 === 0) {
		// If equal, sort by end
		return (
			DateTime.fromISO(a.end).toMillis() -
			DateTime.fromISO(b.end).toMillis()
		);
	}
	return v1;
};

type ExtraState = {
	groupName: string | null;
	imatMeetingId: number | null;
	timeslots: Timeslot[];
	committees: Committee[];
};

const initialState: ExtraState = {
	groupName: null,
	imatMeetingId: null,
	timeslots: [],
	committees: [],
};

const dataSet = "imatBreakouts";
const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	sortComparer,
	initialState,
	reducers: {
		setDetails(state, action: PayloadAction<Partial<ExtraState>>) {
			return { ...state, ...action.payload };
		},
	},
	extraReducers(builder, dataAdapter) {
		builder
			.addMatcher(
				(action) => action.type === getPending.toString(),
				(state, action: ReturnType<typeof getPending>) => {
					const { groupName, imatMeetingId } = action.payload;
					if (
						state.groupName !== groupName ||
						state.imatMeetingId !== imatMeetingId
					) {
						state.groupName = groupName;
						state.imatMeetingId = imatMeetingId;
						dataAdapter.removeAll(state);
					}
				}
			)
			.addMatcher(
				(action) => action.type === clearBreakouts.toString(),
				(state) => {
					dataAdapter.removeAll(state);
					state.timeslots = [];
					state.committees = [];
					state.imatMeetingId = null;
					state.valid = false;
				}
			);
	},
});

export default slice;

/* Slice actions */
export const imatBreakoutsActions = slice.actions;

const {
	getSuccess,
	getFailure,
	setDetails,
	addMany,
	setMany,
	upsertMany,
	removeMany,
	setSelected,
	toggleSelected,
} = slice.actions;

export {
	getSuccess as setBreakouts,
	upsertMany as upsertBreakouts,
	setSelected as setSelectedBreakouts,
	toggleSelected as toggleSelectedBreakouts,
};

// Override the default getPending()
const getPending = createAction<{ groupName: string; imatMeetingId: number }>(
	dataSet + "/getPending"
);
export const clearBreakouts = createAction(dataSet + "/clear");

/* Selectors */
export const selectBreakoutsState = (state: RootState) => state[dataSet];
export const selectBreakoutEntities = (state: RootState) =>
	selectBreakoutsState(state).entities;
export const selectBreakoutIds = (state: RootState) =>
	selectBreakoutsState(state).ids;
export const selectBreakouts = (state: RootState) => {
	const { ids, entities } = selectBreakoutsState(state);
	return ids.map((id) => entities[id]!);
};
export const selectBreakoutMeetingId = (state: RootState) =>
	selectBreakoutsState(state).imatMeetingId;
export const selectBreakoutTimeslots = (state: RootState) =>
	selectBreakoutsState(state).timeslots;
export const selectBreakoutMeeting = (state: RootState) => {
	const imatMeetingId = selectBreakoutMeetingId(state);
	const imatMeetingEntities = selectSyncedImatMeetingEntities(state);
	return imatMeetingId ? imatMeetingEntities[imatMeetingId] : undefined;
};

export const selectImatCommmittees = (state: RootState) =>
	selectBreakoutsState(state).committees;

export type SyncedBreakout = Breakout & {
	imatMeetingId: number | null;
	meetingId: number | null;
};

export const selectSyncedBreakoutEntities = createSelector(
	selectBreakoutMeetingId,
	selectBreakoutEntities,
	selectMeetingEntities,
	(imatMeetingId, breakoutEntities, meetingEntities) => {
		const newEntities: Record<EntityId, SyncedBreakout> = {};
		for (const [key, breakout] of Object.entries(breakoutEntities)) {
			const meeting = Object.values(meetingEntities).find(
				(m) =>
					m!.imatMeetingId === imatMeetingId &&
					m!.imatBreakoutId === breakout!.id
			);
			newEntities[key] = {
				...breakout!,
				imatMeetingId,
				meetingId: meeting?.id || null,
			};
		}
		return newEntities;
	}
);

export const imatBreakoutsSelectors = getAppTableDataSelectors(
	selectBreakoutsState,
	{ selectEntities: selectSyncedBreakoutEntities, getField }
);

/* Thunk actions */
function validBreakout(b: any): b is Breakout {
	return (
		isObject(b) &&
		typeof b.id === "number" &&
		typeof b.name === "string" &&
		typeof b.location === "string" &&
		typeof b.day === "number"
	);
}

function validGetResponse(response: any): response is {
	breakouts: Breakout[];
	timeslots: Timeslot[];
	committees: Committee[];
} {
	return (
		isObject(response) &&
		Array.isArray(response.breakouts) &&
		response.breakouts.every(validBreakout) &&
		Array.isArray(response.timeslots) &&
		Array.isArray(response.committees)
	);
}

function validResponse(response: any): response is Breakout[] {
	return Array.isArray(response) && response.every(validBreakout);
}

let loadingPromise: Promise<Breakout[]>;
export const loadBreakouts =
	(groupName: string, imatMeetingId: number): AppThunk<Breakout[]> =>
	(dispatch, getState) => {
		const {
			loading,
			groupName: currentGroupName,
			imatMeetingId: currentImatMeetingId,
		} = selectBreakoutsState(getState());
		if (
			loading &&
			currentGroupName === groupName &&
			imatMeetingId === currentImatMeetingId
		) {
			return loadingPromise;
		}
		dispatch(getPending({ groupName, imatMeetingId }));
		const url = `/api/${groupName}/imat/breakouts/${imatMeetingId}`;
		loadingPromise = fetcher
			.get(url)
			.then((response: any) => {
				if (!validGetResponse(response))
					throw new TypeError("Unexpected response");
				dispatch(getSuccess(response.breakouts));
				const { timeslots, committees } = response;
				dispatch(setDetails({ timeslots, committees }));
				return response.breakouts;
			})
			.catch((error: any) => {
				dispatch(getFailure());
				dispatch(
					setError(
						`Unable to get breakouts for ${imatMeetingId}`,
						error
					)
				);
				return [];
			});
		return loadingPromise;
	};

export const addBreakouts =
	(imatMeetingId: number, breakouts: Breakout[]): AppThunk<number[]> =>
	async (dispatch, getState) => {
		const { groupName } = selectBreakoutsState(getState());
		const url = `/api/${groupName}/imat/breakouts/${imatMeetingId}`;
		let response: any;
		try {
			response = await fetcher.post(url, breakouts);
			if (!validResponse(response))
				throw new TypeError("Unexpected response");
		} catch (error) {
			dispatch(setError("Unable to add breakouts", error));
			return [];
		}
		dispatch(addMany(response));
		return response.map((b: Breakout) => b.id);
	};

export const updateBreakouts =
	(imatMeetingId: number, breakouts: Partial<Breakout>[]): AppThunk =>
	async (dispatch, getState) => {
		const { groupName } = selectBreakoutsState(getState());
		const url = `/api/${groupName}/imat/breakouts/${imatMeetingId}`;
		let response: any;
		try {
			response = await fetcher.put(url, breakouts);
			if (!validResponse(response))
				throw new TypeError("Unexpected response");
		} catch (error) {
			dispatch(setError("Unable to update breakouts", error));
			return;
		}
		dispatch(setMany(response));
	};

export const deleteBreakouts =
	(imatMeetingId: number, ids: EntityId[]): AppThunk =>
	async (dispatch, getState) => {
		const { groupName } = selectBreakoutsState(getState());
		const url = `/api/${groupName}/imat/breakouts/${imatMeetingId}`;
		try {
			await fetcher.delete(url, ids);
		} catch (error) {
			dispatch(setError("Unable to delete breakouts", error));
			return;
		}
		dispatch(removeMany(ids));
	};
