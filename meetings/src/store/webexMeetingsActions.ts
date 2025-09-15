import { fetcher, setError, shallowEqual } from "@common";

import slice, { getPending, clearWebexMeetings } from "./webexMeetingsSlice";
import type { AppThunk } from ".";
import {
	selectWebexMeetingsAge,
	selectWebexMeetingsState,
	WebexMeeting,
	WebexMeetingChange,
} from "./webexMeetingsSelectors";
import { webexMeetingsSchema, WebexMeetingsQuery } from "@schemas/webex";

export const webexMeetingsActions = slice.actions;

const {
	getSuccess,
	getFailure,
	removeMany,
	addMany,
	upsertMany,
	setMany,
	setSelected,
	setProperty,
} = slice.actions;

export {
	getSuccess as setWebexMeetings,
	upsertMany as upsertWebexMeetings,
	setSelected,
	setProperty as setUiProperty,
	clearWebexMeetings,
};

const AGE_STALE = 60 * 60 * 1000; // 1 hour
let loading = false;
let loadingPromise: Promise<void>;
export const loadWebexMeetings =
	(
		groupName: string,
		query?: WebexMeetingsQuery,
		force = false
	): AppThunk<void> =>
	(dispatch, getState) => {
		const state = getState();
		const current = selectWebexMeetingsState(state);
		if (
			current.groupName === groupName &&
			shallowEqual(current.query, query)
		) {
			if (loading) return loadingPromise;
			const age = selectWebexMeetingsAge(state);
			if (!force && age && age < AGE_STALE) return Promise.resolve();
		}
		dispatch(getPending({ groupName, query }));
		const url = `/api/${groupName}/webex/meetings`;
		loading = true;
		loadingPromise = fetcher
			.get(url, query)
			.then((response: unknown) => {
				const webexMeetings = webexMeetingsSchema.parse(response);
				dispatch(getSuccess(webexMeetings));
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

export const addWebexMeeting =
	(
		accountId: number,
		webexMeeting: Omit<WebexMeetingChange, "accountId" | "id">
	): AppThunk<string | null> =>
	async (dispatch, getState) => {
		const { groupName } = selectWebexMeetingsState(getState());
		const url = `/api/${groupName}/webex/meetings`;
		const meetings = [{ accountId, ...webexMeeting }];
		let webexMeetings: WebexMeeting[];
		try {
			const response = await fetcher.post(url, meetings);
			webexMeetings = webexMeetingsSchema.parse(response);
			if (webexMeetings.length !== 1)
				throw new Error("Unexpected response to POST " + url);
		} catch (error) {
			dispatch(setError("POST " + url, error));
			return null;
		}
		dispatch(addMany(webexMeetings));
		return webexMeetings[0].id;
	};

export type WebexMeetingUpdate = Partial<WebexMeetingChange> & {
	accountId: number;
	id: string;
};

export const updateWebexMeetings =
	(webexMeetingsIn: WebexMeetingUpdate[]): AppThunk =>
	async (dispatch, getState) => {
		const { groupName } = selectWebexMeetingsState(getState());
		const url = `/api/${groupName}/webex/meetings`;
		let webexMeetings: WebexMeeting[];
		try {
			const response = await fetcher.patch(url, webexMeetingsIn);
			webexMeetings = webexMeetingsSchema.parse(response);
		} catch (error) {
			dispatch(setError("PATCH " + url, error));
			return;
		}
		dispatch(setMany(webexMeetings));
	};

export const deleteWebexMeetings =
	(webexMeetings: { accountId: number; id: string }[]): AppThunk =>
	async (dispatch, getState) => {
		const { groupName } = selectWebexMeetingsState(getState());
		const url = `/api/${groupName}/webex/meetings`;
		const meetings = webexMeetings.map(({ accountId, id }) => ({
			accountId,
			id,
		}));
		const ids = meetings.map((m) => m.id);
		try {
			await fetcher.delete(url, meetings);
		} catch (error) {
			dispatch(setError("DELETE " + url, error));
			return;
		}
		dispatch(removeMany(ids));
	};
