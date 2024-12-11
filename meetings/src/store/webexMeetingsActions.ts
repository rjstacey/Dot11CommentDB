import { fetcher, setError } from "dot11-components";

import slice, { getPending, clearWebexMeetings } from "./webexMeetingsSlice";
import type { AppThunk } from ".";
import {
	selectWebexMeetingsState,
	WebexMeeting,
	WebexMeetingChange,
} from "./webexMeetingsSelectors";
import { LoadMeetingsConstraints } from "./meetingsSelectors";

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

function validateResponse(
	method: string,
	response: any
): asserts response is WebexMeeting[] {
	if (!Array.isArray(response))
		throw new TypeError(`Unexpected response to ${method}`);
}

let loadingUrl: string;
let loadingPromise: Promise<WebexMeeting[]> | undefined;
export const loadWebexMeetings =
	(
		groupName: string,
		constraints?: LoadMeetingsConstraints
	): AppThunk<WebexMeeting[]> =>
	(dispatch, getState) => {
		const url =
			`/api/${groupName}/webex/meetings` +
			(constraints ? "?" + new URLSearchParams(constraints) : "");
		if (loadingPromise && loadingUrl === url) {
			return loadingPromise;
		}
		dispatch(getPending({ groupName }));
		loadingUrl = url;
		loadingPromise = fetcher
			.get(url)
			.then((response: any) => {
				validateResponse("GET", response);
				dispatch(getSuccess(response));
				return response;
			})
			.catch((error: any) => {
				dispatch(getFailure());
				dispatch(setError("Unable to get list of meetings", error));
				return [];
			})
			.finally(() => {
				loadingPromise = undefined;
			});
		return loadingPromise!;
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
		let response: any;
		try {
			response = await fetcher.post(url, meetings);
			validateResponse("POST", response);
		} catch (error) {
			dispatch(setError("Unable to add webex meeting", error));
			return null;
		}
		dispatch(addMany(response));
		return response[0].id;
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
		let response: any;
		try {
			response = await fetcher.patch(url, webexMeetingsIn);
			validateResponse("PATCH", response);
		} catch (error) {
			dispatch(setError("Unable to add webex meeting", error));
			return;
		}
		dispatch(setMany(response));
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
			dispatch(setError(`Unable to delete webex meetings ${ids}`, error));
			return;
		}
		dispatch(removeMany(ids));
	};
