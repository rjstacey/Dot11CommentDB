import { EntityId } from "@reduxjs/toolkit";
import { fetcher, shallowEqual } from "@common";

import slice, { getPending, clearMeetings } from "./meetingsSlice";

import type { AppThunk } from ".";
import { setError } from ".";
import { setWebexMeetings, upsertWebexMeetings } from "./webexMeetings";
import { upsertBreakouts } from "./imatBreakouts";
import {
	selectMeetingsState,
	selectMeetingsAge,
	MeetingCreate,
	MeetingUpdate,
	MeetingsQuery,
} from "./meetingsSelectors";
import {
	meetingsGetResponse,
	meetingsUpdateResponse,
	MeetingsUpdateResponse,
} from "@schemas/meetings";

export const meetingsActions = slice.actions;

const {
	getSuccess,
	getFailure,
	upsertMany,
	setMany,
	addMany,
	removeMany,
	setProperty,
	setUiProperties,
	setSelected,
	toggleSelected,
	setSelectedSlots,
	toggleSelectedSlots,
	setPanelIsSplit,
} = slice.actions;

export const setMeetingsCurrentPanelIsSplit = (isSplit: boolean) =>
	setPanelIsSplit({ isSplit });

export {
	setProperty as setUiProperty,
	setUiProperties,
	setSelected as setSelectedMeetings,
	toggleSelected as toggleSelectedMeetings,
	setSelectedSlots,
	toggleSelectedSlots,
	upsertMany as upsertMeetings,
	clearMeetings,
};

const AGE_STALE = 60 * 60 * 1000; // 1 hour
let loading = false;
let loadingPromise: Promise<void>;
export const loadMeetings =
	(
		groupName: string,
		query?: MeetingsQuery, //LoadMeetingsConstraints,
		force = false
	): AppThunk<void> =>
	(dispatch, getState) => {
		const state = getState();
		const current = selectMeetingsState(state);
		if (
			current.groupName === groupName &&
			shallowEqual(current.query, query)
		) {
			if (loading) return loadingPromise;
			const age = selectMeetingsAge(state);
			if (!force && age && age < AGE_STALE) return Promise.resolve();
		}
		dispatch(getPending({ groupName, query }));
		const url = `/api/${groupName}/meetings`;
		loading = true;
		loadingPromise = fetcher
			.get(url, query)
			.then((response) => {
				const { meetings, webexMeetings } =
					meetingsGetResponse.parse(response);
				dispatch(getSuccess(meetings));
				dispatch(setSelectedSlots([]));
				dispatch(setWebexMeetings(webexMeetings));
			})
			.catch((error: unknown) => {
				dispatch(getFailure());
				dispatch(setError("GET " + url, error));
			})
			.finally(() => {
				loading = false;
			});
		return loadingPromise;
	};

export const updateMeetings =
	(updates: MeetingUpdate[]): AppThunk =>
	async (dispatch, getState) => {
		const { groupName } = selectMeetingsState(getState());
		const url = `/api/${groupName}/meetings`;
		let r: MeetingsUpdateResponse;
		try {
			const response = await fetcher.patch(url, updates);
			r = meetingsUpdateResponse.parse(response);
		} catch (error) {
			dispatch(setError("PATCH " + url, error));
			return;
		}
		const { meetings, webexMeetings, breakouts } = r;
		dispatch(setMany(meetings));
		dispatch(upsertWebexMeetings(webexMeetings));
		dispatch(upsertBreakouts(breakouts));
	};

export const addMeetings =
	(meetingsToAdd: MeetingCreate[]): AppThunk<EntityId[]> =>
	async (dispatch, getState) => {
		const { groupName } = selectMeetingsState(getState());
		const url = `/api/${groupName}/meetings`;
		let r: MeetingsUpdateResponse;
		try {
			const response = await fetcher.post(url, meetingsToAdd);
			r = meetingsUpdateResponse.parse(response);
		} catch (error) {
			dispatch(setError("POST " + url, error));
			return [];
		}
		const { meetings, webexMeetings, breakouts } = r;
		dispatch(addMany(meetings));
		if (webexMeetings) dispatch(upsertWebexMeetings(webexMeetings));
		if (breakouts) dispatch(upsertBreakouts(breakouts));
		return meetings.map((e) => e.id);
	};

export const deleteMeetings =
	(ids: EntityId[]): AppThunk =>
	async (dispatch, getState) => {
		const { groupName } = selectMeetingsState(getState());
		return fetcher
			.delete(`/api/${groupName}/meetings`, ids)
			.then(() => {
				dispatch(removeMany(ids));
			})
			.catch((error: unknown) => {
				dispatch(setError(`Unable to delete meetings ${ids}`, error));
			});
	};
