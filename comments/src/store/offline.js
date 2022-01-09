import {createSlice} from '@reduxjs/toolkit';
import {REHYDRATE} from 'redux-persist';
import {fetcher} from 'dot11-components/lib';

const dataSet = 'offline';

export const initialState = {
	online: false,
	busy: false,
	timerId: 0,
	outbox: [],
	retryCount: 0,
};

/*
 * Reducer => maintain transaction state
 */
const slice = createSlice({
	name: dataSet,
	initialState,
	reducers: {
		setNetworkStatus(state, action) {
			state.online = action.payload;
		},
		fetchStart(state, action) {
			state.busy = true;
			state.retryCount++;
		},
		delayStart(state, action) {
			state.busy = false;
			state.timerId = action.payload;
		},
		delayEnd(state, action) {
			state.timerId = 0;
		},
		enqueue(state, action) {
			state.outbox = [...state.outbox, action.payload];
		},
		dequeue(state, action) {
			const [, ...outbox] = state.outbox;
			state.outbox = outbox;
			state.busy = false;
			state.retryCount = 0;
		},
		reset(state, action) {
			return {
				...initialState,
				online: state.online,
			};
		}
	},
	extraReducers: (builder) => {
		builder
		.addMatcher(
			(action) => action.type === REHYDRATE,
			(state, action) => {
				if (action.payload && action.payload[dataSet]) {
					const offline = action.payload[dataSet];
					const outbox = offline.outbox || state.outbox;
					return {
						...state,
						outbox,
					}
				}
			}
		)
	}
});

export default slice.reducer;

const {
	setNetworkStatus,
	fetchStart,
	delayStart,
	delayEnd,
	enqueue,
	dequeue
} = slice.actions;


export function registerOffline(store) {
	function onChange(online) {
		if (window.requestAnimationFrame) {
			window.requestAnimationFrame(() => store.dispatch(networkStateChange(online)));
		} else {
			setTimeout(() => store.dispatch(networkStateChange(online)), 0);
		}
	}

	if (typeof window !== 'undefined' && window.addEventListener) {
		window.addEventListener('online', () => onChange(true));
		window.addEventListener('offline', () => onChange(false));
		onChange(window.navigator.onLine);
	}
}
/*
 * Selectors
 */
export const selectOfflineState = (state) => state[dataSet];

export const selectOfflineStatus = (state) => {
	const offline = state[dataSet];
	let status = 'offline';
	if (offline.retryCount > 1)
		status = 'unreachable';
	else if (offline.online)
		status = 'online';
	return status;
}

export const selectOfflineOutbox = (state) => state[dataSet].outbox;

/*
 * Actions => update transaction state and initiate new actions
 */

const networkStateChange = (online) =>
	(dispatch, getState) => {
		dispatch(setNetworkStatus(online));

		const state = selectOfflineState(getState());
		if (state.timerId) {
			clearTimeout(state.timerId);
			dispatch(delayEnd());
		}
		if (online) {
			dispatch(send());
		}
	}

const scheduleRetry = (delay) =>
	(dispatch, getState) => {
		const timerId = setTimeout(() => {
			dispatch(delayEnd());
			dispatch(send());
		}, delay);
		return dispatch(delayStart(timerId));
	}

function mustDiscard(error, retries) {
	if (!('status' in error))
		return true;

	// discard for http 4xx errors
	return error.status >= 400 && error.status < 500;
}

const delaySchedule = [
	1000, // After 1 second
	1000 * 2, // After 2 seconds
	1000 * 4, // After 4 seconds
	1000 * 8, // After 8 seconds
	1000 * 16, // After 16 seconds
	1000 * 32, // After 32 seconds
];

function retryDelay(retries) {
	if (retries >= delaySchedule.length)
		retries = delaySchedule.length - 1;
	return delaySchedule[retries] || null;
}

const send = () =>
	(dispatch, getState) => {

		const state = selectOfflineState(getState());
		if (state.outbox.length === 0 || !state.online)
			return;

		const action = state.outbox[0];

		dispatch(fetchStart());
		const {method, url, params} = action.effect;
		return fetcher.fetch(method, url, params)
			.then(result => {
				dispatch(dequeue());
				if (action.commit) {
					const commitAction = {...action.commit, payload: result};
					try {
						dispatch(commitAction);
					} catch (error) {
						console.error(error);
					}
				}

				return dispatch(send());
			})
			.catch(error => {
				const state = getState()[dataSet];
				if (!mustDiscard(error, state.retryCount)) {
					const delay = retryDelay(state.retryCount);
					if (delay != null)
						return dispatch(scheduleRetry(delay));
				}

				dispatch(dequeue());
				if (action.rollback) {
					const rollbackAction = {...action.rollback, error};
					try {
						dispatch(rollbackAction);
					} catch (error) {
						console.error(error);
					}
				}

				return dispatch(send());
			})
	};

export const offlineFetch = ({effect, commit, rollback}) =>
	(dispatch, getState) => {
		dispatch(enqueue({effect, commit, rollback}));
		const state = selectOfflineState(getState());
		if (state.timerId) {
			clearTimeout(state.timerId);
			dispatch(delayEnd());
		}
		dispatch(send());
	}

