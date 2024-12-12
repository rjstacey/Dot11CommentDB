import { EntityId } from "@reduxjs/toolkit";
import { fetcher, setError, isObject, shallowEqual } from "dot11-components";

import slice, { getPending, clearMeetings } from "./meetingsSlice";

import type { AppThunk } from ".";
import { setWebexMeetings, upsertWebexMeetings } from "./webexMeetings";
import { upsertBreakouts } from "./imatBreakouts";
import {
	selectMeetingsState,
	selectMeetingsAge,
	Meeting,
	MeetingCreate,
	LoadMeetingsConstraints,
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

function validateResponse(method: string, response: any) {
	if (
		!isObject(response) ||
		!Array.isArray(response.meetings) ||
		(response.webexMeetings && !Array.isArray(response.webexMeetings)) ||
		(response.breakouts && !Array.isArray(response.breakouts))
	) {
		throw new TypeError(`Unexpected response to ${method}`);
	}
}

const AGE_STALE = 60 * 60 * 1000; // 1 hour
let loading = false;
let loadingPromise: Promise<void>;
export const loadMeetings =
	(
		groupName: string,
		query?: LoadMeetingsConstraints,
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
		const url =
			`/api/${groupName}/meetings` +
			(query ? "?" + new URLSearchParams(query) : "");
		loading = true;
		loadingPromise = fetcher
			.get(url)
			.then((response: any) => {
				const { meetings, webexMeetings } =
					meetingsGetResponse.parse(response);
				dispatch(getSuccess(meetings));
				dispatch(setSelectedSlots([]));
				dispatch(setWebexMeetings(webexMeetings));
			})
			.catch((error: any) => {
				dispatch(getFailure());
				dispatch(setError("GET " + url, error));
			})
			.finally(() => {
				loading = false;
			});
		return loadingPromise;
	};

type Update<T> = {
	id: EntityId;
	changes: Partial<T>;
};

export const updateMeetings =
	(updates: Update<MeetingCreate>[]): AppThunk =>
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
		let response: any;
		try {
			response = await fetcher.post(url, meetingsToAdd);
			validateResponse("POST", response);
		} catch (error) {
			dispatch(setError("Unable to add meetings:", error));
			return [];
		}
		const { meetings, webexMeetings, breakouts } = response;
		dispatch(addMany(meetings));
		if (webexMeetings) dispatch(upsertWebexMeetings(webexMeetings));
		if (breakouts) dispatch(upsertBreakouts(breakouts));
		return meetings.map((e: Meeting) => e.id);
	};

export const deleteMeetings =
	(ids: EntityId[]): AppThunk =>
	async (dispatch, getState) => {
		const { groupName } = selectMeetingsState(getState());
		return fetcher
			.delete(`/api/${groupName}/meetings`, ids)
			.then(() => dispatch(removeMany(ids)))
			.catch((error: any) =>
				dispatch(setError(`Unable to delete meetings ${ids}`, error))
			);
	};
