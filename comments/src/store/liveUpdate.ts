import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { selectOfflineState } from "./offline";
import { getCommentUpdates } from "./comments";
import type { StoreType, AppThunk, RootState } from ".";

/* One second polling utility */
let timerId: NodeJS.Timeout | null = null;

function startPoll(callback: () => void) {
	function poll() {
		timerId = setTimeout(poll, 1000);
		callback();
	}
	if (!timerId) poll();
}

function stopPoll() {
	if (timerId) {
		clearTimeout(timerId);
		timerId = null;
	}
}

/* Create slice */
const dataSet = "liveUpdate";
const slice = createSlice({
	name: dataSet,
	initialState: false,
	reducers: {
		setLiveUpdate(state, action: PayloadAction<boolean>) {
			return action.payload;
		},
	},
});
export default slice;

/* Slice actions */
export const { setLiveUpdate } = slice.actions;

/* Selectors */
export const selectLiveUpdateState = (state: RootState) => state[dataSet];

/* Thunk actions */
const pollForUpdates = (): AppThunk => async (dispatch, getState) => {
	const offline = selectOfflineState(getState());
	if (offline.online && offline.outbox.length === 0) {
		dispatch(getCommentUpdates());
	}
};

const visibilityChange =
	(hidden: boolean): AppThunk =>
	async (dispatch, getState) => {
		if (!hidden && !timerId && selectLiveUpdateState(getState())) {
			startPoll(() => dispatch(pollForUpdates()));
		} else {
			stopPoll();
		}
	};

const storeChange = (
	dispatch: StoreType["dispatch"],
	getState: StoreType["getState"]
) => {
	const state = getState();
	const offline = selectOfflineState(state);
	const liveUpdate = selectLiveUpdateState(state);
	if (
		offline.online &&
		offline.outbox.length === 0 &&
		liveUpdate &&
		!timerId
	) {
		startPoll(() => dispatch(pollForUpdates()));
	} else if ((!offline.online || !liveUpdate) && timerId) {
		stopPoll();
	}
};

export function registerLiveUpdate(store: StoreType) {
	function onChange() {
		store.dispatch(visibilityChange(document.hidden));
	}

	document.addEventListener("visibilitychange", onChange);
	onChange();

	store.subscribe(() => storeChange(store.dispatch, store.getState));
}
