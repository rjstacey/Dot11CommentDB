import {
	createSlice,
	Action,
	PayloadAction,
	isPlainObject,
} from "@reduxjs/toolkit";
import { REHYDRATE } from "redux-persist";
import { fetcher } from "dot11-components";
import type { StoreType, RootState, AppThunk, AppDispatch } from ".";

type OfflineState = {
	online: boolean;
	busy: boolean;
	timerId: number;
	outbox: OfflineFetchAction[];
	retryCount: number;
};

export const initialState: OfflineState = {
	online: window.navigator.onLine,
	busy: false,
	timerId: 0,
	outbox: [],
	retryCount: 0,
};

/*
 * Create slice
 * The slice maintains transaction state
 */
const dataSet = "offline";
const slice = createSlice({
	name: dataSet,
	initialState,
	reducers: {
		setNetworkStatus(state, action: PayloadAction<boolean>) {
			state.online = action.payload;
		},
		fetchStart(state) {
			state.busy = true;
			state.retryCount++;
		},
		delayStart(state, action) {
			state.busy = false;
			state.timerId = action.payload;
		},
		delayEnd(state) {
			state.timerId = 0;
		},
		enqueue(state, action: PayloadAction<OfflineFetchAction>) {
			state.outbox = [...state.outbox, action.payload];
		},
		dequeue(state) {
			const [, ...outbox] = state.outbox;
			state.outbox = outbox;
			state.busy = false;
			state.retryCount = 0;
		},
		reset(state) {
			return {
				...initialState,
				online: state.online,
			};
		},
	},
	extraReducers: (builder) => {
		builder.addMatcher(
			(action) => action.type === REHYDRATE,
			(state, action) => {
				if (action.payload && action.payload[dataSet]) {
					const offline = action.payload[dataSet];
					const outbox = offline.outbox || state.outbox;
					return {
						...state,
						outbox,
					};
				}
			}
		);
	},
});

export default slice;

/* Slice actions */
const { setNetworkStatus, fetchStart, delayStart, delayEnd, enqueue, dequeue } =
	slice.actions;

/* Selectors */
export const selectOfflineState = (state: RootState) => state[dataSet];

export type OfflineStatus = "offline" | "unreachable" | "online";
export const selectOfflineStatus = (state: RootState): OfflineStatus => {
	const offline = selectOfflineState(state);
	let status: OfflineStatus = "offline";
	if (offline.retryCount > 1) status = "unreachable";
	else if (offline.online) status = "online";
	return status;
};
export const selectIsOnline = (state: RootState) =>
	selectOfflineState(state).online;
export const selectOfflineOutbox = (state: RootState) =>
	selectOfflineState(state).outbox;

/*
 * Thunk actions => update transaction state and initiate new actions
 */
const networkStateChange =
	(online: boolean): AppThunk =>
	async (dispatch, getState) => {
		dispatch(setNetworkStatus(online));

		const state = selectOfflineState(getState());
		if (state.timerId) {
			clearTimeout(state.timerId);
			dispatch(delayEnd());
		}
		if (online) {
			dispatch(send());
		}
	};

const scheduleRetry =
	(delay: number): AppThunk<ReturnType<AppDispatch>> =>
	async (dispatch) => {
		const timerId = setTimeout(() => {
			dispatch(delayEnd());
			dispatch(send());
		}, delay);
		return dispatch(delayStart(timerId));
	};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isGenericObject(o: unknown): o is Record<string, any> {
	return isPlainObject(o);
}

function mustDiscard(error: unknown) {
	if (isGenericObject(error) && "status" in error) {
		// discard for http 4xx errors
		return error.status >= 400 && error.status < 500;
	}
	return true;
}

const delaySchedule = [
	1000, // After 1 second
	1000 * 2, // After 2 seconds
	1000 * 4, // After 4 seconds
	1000 * 8, // After 8 seconds
	1000 * 16, // After 16 seconds
	1000 * 32, // After 32 seconds
];

function retryDelay(retries: number) {
	if (retries >= delaySchedule.length) retries = delaySchedule.length - 1;
	return delaySchedule[retries] || null;
}

const send = (): AppThunk<unknown> => async (dispatch, getState) => {
	const state = selectOfflineState(getState());
	if (state.outbox.length === 0 || !state.online) return;

	const action = state.outbox[0];

	dispatch(fetchStart());
	const { method, url, params } = action.effect;
	return fetcher
		.fetch(method, url, params)
		.then((result: unknown) => {
			dispatch(dequeue());
			if (action.commit) {
				const commitAction = { ...action.commit, payload: result };
				try {
					dispatch(commitAction);
				} catch (error) {
					console.error(error);
				}
			}

			return dispatch(send());
		})
		.catch((error) => {
			const state = selectOfflineState(getState());
			if (!mustDiscard(error)) {
				const delay = retryDelay(state.retryCount);
				if (delay != null) return dispatch(scheduleRetry(delay));
			}

			dispatch(dequeue());
			if (action.rollback) {
				const rollbackAction = { ...action.rollback, error };
				try {
					dispatch(rollbackAction);
				} catch (error) {
					console.error(error);
				}
			}

			return dispatch(send());
		});
};

export type Effect<T extends object = object> = {
	method: "GET" | "PATCH" | "PUT" | "POST" | "DELETE";
	url: string;
	params: T;
};

export type OfflineFetchAction = {
	effect: Effect;
	commit: Action;
	rollback?: Action;
};

export const offlineFetch =
	(offlineFetchAction: OfflineFetchAction): AppThunk =>
	async (dispatch, getState) => {
		dispatch(enqueue(offlineFetchAction));
		const state = selectOfflineState(getState());
		if (state.timerId) {
			clearTimeout(state.timerId);
			dispatch(delayEnd());
		}
		dispatch(send());
	};

/** Register with store */
export function registerOffline(store: StoreType) {
	function onChange(online: boolean) {
		if (window.requestAnimationFrame) {
			window.requestAnimationFrame(() =>
				store.dispatch(networkStateChange(online))
			);
		} else {
			setTimeout(() => store.dispatch(networkStateChange(online)), 0);
		}
	}

	if (typeof window !== "undefined" && window.addEventListener) {
		window.addEventListener("online", () => onChange(true));
		window.addEventListener("offline", () => onChange(false));
		onChange(window.navigator.onLine);
	}
}
