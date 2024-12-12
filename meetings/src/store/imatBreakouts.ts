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
	createAppTableDataSlice,
	FieldType,
	getAppTableDataSelectors,
	Fields,
} from "dot11-components";

import type { AppThunk, RootState } from ".";
import { selectMeetingEntities } from "./meetings";
import { selectSyncedImatMeetingEntities } from "./imatMeetings";
import {
	Breakout,
	ImatTimeslot,
	ImatCommittee,
	breakoutsSchema,
	getImatBreakoutsResponseSchema,
} from "@schemas/imat";

export type { Breakout, ImatTimeslot, ImatCommittee };

const displayGroup = (group: string) => {
	const parts = group.split("/");
	return parts[parts.length - 1];
};

export const fields: Fields = {
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
		return DateTime.fromFormat(entity.endTime, "HH:mm").diff(
			DateTime.fromFormat(entity.startTime, "HH:mm"),
			"hours"
		).hours;
	return entity[dataKey as keyof Breakout];
};

//type ImatBreakoutsState = ExtraState & AppTableDataState<Breakout>;

const sortComparer = (a: Breakout, b: Breakout) => {
	// Sort by start
	const v1 = a.day - b.day;
	if (v1 === 0) {
		// If equal, sort by end
		return (
			DateTime.fromFormat(a.endTime, "HH:mm").toMillis() -
			DateTime.fromFormat(b.endTime, "HH:mm").toMillis()
		);
	}
	return v1;
};

type ExtraState = {
	groupName: string | null;
	imatMeetingId: number | null;
	timeslots: ImatTimeslot[];
	committees: ImatCommittee[];
	lastLoad: string | null;
};

const initialState: ExtraState = {
	groupName: null,
	imatMeetingId: null,
	timeslots: [],
	committees: [],
	lastLoad: null,
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
					state.lastLoad = new Date().toISOString();
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
const selectBreakoutsAge = (state: RootState) => {
	let lastLoad = selectBreakoutsState(state).lastLoad;
	if (!lastLoad) return NaN;
	return new Date().valueOf() - new Date(lastLoad).valueOf();
};
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
const AGE_STALE = 60 * 60 * 1000; // 1 hour
let loading = false;
let loadingPromise: Promise<Breakout[]>;
export const loadBreakouts =
	(
		groupName: string,
		imatMeetingId: number,
		force = false
	): AppThunk<Breakout[]> =>
	(dispatch, getState) => {
		const state = getState();
		const current = selectBreakoutsState(state);
		if (
			current.groupName === groupName &&
			current.imatMeetingId === imatMeetingId
		) {
			if (loading) return loadingPromise;
			const age = selectBreakoutsAge(state);
			if (!force && age && age < AGE_STALE)
				return Promise.resolve(selectBreakouts(state));
		}
		dispatch(getPending({ groupName, imatMeetingId }));
		const url = `/api/${groupName}/imat/breakouts/${imatMeetingId}`;
		loading = true;
		loadingPromise = fetcher
			.get(url)
			.then((response: any) => {
				const { breakouts, timeslots, committees } =
					getImatBreakoutsResponseSchema.parse(response);
				dispatch(getSuccess(breakouts));
				dispatch(setDetails({ timeslots, committees }));
				return selectBreakouts(getState());
			})
			.catch((error: any) => {
				dispatch(getFailure());
				dispatch(setError("GET " + url, error));
				return selectBreakouts(getState());
			})
			.finally(() => {
				loading = false;
			});
		return loadingPromise;
	};

export const addBreakouts =
	(imatMeetingId: number, breakoutsIn: Breakout[]): AppThunk<number[]> =>
	async (dispatch, getState) => {
		const { groupName } = selectBreakoutsState(getState());
		const url = `/api/${groupName}/imat/breakouts/${imatMeetingId}`;
		let breakouts: Breakout[];
		try {
			const response = await fetcher.post(url, breakoutsIn);
			breakouts = breakoutsSchema.parse(response);
		} catch (error) {
			dispatch(setError("POST " + url, error));
			return [];
		}
		dispatch(addMany(breakouts));
		return breakouts.map((b: Breakout) => b.id);
	};

export const updateBreakouts =
	(imatMeetingId: number, breakoutsIn: Partial<Breakout>[]): AppThunk =>
	async (dispatch, getState) => {
		const { groupName } = selectBreakoutsState(getState());
		const url = `/api/${groupName}/imat/breakouts/${imatMeetingId}`;
		let breakouts: Breakout[];
		try {
			const response = await fetcher.put(url, breakoutsIn);
			breakouts = breakoutsSchema.parse(response);
		} catch (error) {
			dispatch(setError("PUT " + url, error));
			return;
		}
		dispatch(setMany(breakouts));
	};

export const deleteBreakouts =
	(imatMeetingId: number, ids: EntityId[]): AppThunk =>
	async (dispatch, getState) => {
		const { groupName } = selectBreakoutsState(getState());
		const url = `/api/${groupName}/imat/breakouts/${imatMeetingId}`;
		try {
			await fetcher.delete(url, ids);
		} catch (error) {
			dispatch(setError("DELETE " + url, error));
			return;
		}
		dispatch(removeMany(ids));
	};
