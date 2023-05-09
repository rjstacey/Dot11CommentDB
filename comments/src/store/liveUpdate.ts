import {createSlice} from '@reduxjs/toolkit';
import {selectOfflineState} from './offline';
import {getCommentUpdates} from './comments';
import type { StoreType, AppThunk, RootState } from '.';

const dataSet = 'liveUpdate';

const initialState = {
	live: false,
}

const slice = createSlice({
	name: dataSet,
	initialState,
	reducers: {
		setLive(state, action) {
			state.live = action.payload;
		}
	}
});

export default slice;

/*
 * Selectors
 */
export const selectLiveUpdateState = (state: RootState) => state[dataSet];


/*
 * Actions
 */
const {setLive} = slice.actions;

export const setLiveUpdate = setLive;

let timerId: NodeJS.Timeout | null = null;

function startPoll(dispatch) {
	function poll() {
		timerId = setTimeout(poll, 1000);
		dispatch(pollForUpdates());
	}
	if (!timerId)
		poll();
}

function stopPoll() {
	if (timerId) {
		clearTimeout(timerId);
		timerId = null;
	}
}

const pollForUpdates = (): AppThunk =>
	async (dispatch, getState) => {
		const state = getState();
		const offline = selectOfflineState(state);
		if (offline.online && offline.outbox.length === 0) {
			dispatch(getCommentUpdates());
		}
	}

const visibilityChange = (hidden): AppThunk =>
	async (dispatch, getState) => {
		if (!hidden) {
			if (!timerId) {
				const state = getState();
				const liveUpdate = selectLiveUpdateState(state);
				if (liveUpdate.live)
					startPoll(dispatch);
			}
		}
		else {
			stopPoll();
		}
	}

const storeChange = (dispatch, getState) => {
	const state = getState();
	const offline = selectOfflineState(state);
	const liveUpdate = selectLiveUpdateState(state);
	if (offline.online && offline.outbox.length === 0 && liveUpdate.live && !timerId) {
		startPoll(dispatch);
	}
	else if ((!offline.online || !liveUpdate.live) && timerId) {
		stopPoll();
	}
}

export function registerLiveUpdate(store: StoreType) {
	let hidden: string | undefined = "hidden";
	if (hidden in document)
		document.addEventListener("visibilitychange", onChange);
	else if ((hidden = "mozHidden") in document)
		document.addEventListener("mozvisibilitychange", onChange);
	else if ((hidden = "webkitHidden") in document)
		document.addEventListener("webkitvisibilitychange", onChange);
	else if ((hidden = "msHidden") in document)
		document.addEventListener("msvisibilitychange", onChange);
	else
		hidden = undefined;

	function onChange() {
		store.dispatch(visibilityChange(document[hidden!]));
	}

	// set the initial state
	if (hidden !== undefined)
		onChange();
	else
		store.dispatch(visibilityChange(false));

	store.subscribe(() => storeChange(store.dispatch, store.getState));
}

