import {
	combineReducers,
	configureStore as configureReduxStore,
} from "@reduxjs/toolkit";
import type { Action, ThunkAction, Middleware } from "@reduxjs/toolkit";
import { createLogger } from "redux-logger";
import { persistStore, persistReducer, createTransform } from "redux-persist";
import autoMergeLevel2 from "redux-persist/lib/stateReconciler/autoMergeLevel2";
import { get, set, del } from "idb-keyval";

import { errorsSlice } from "dot11-components";

import userSlice from "./user";
import currentSlice from "./current";
import membersSlice from "./members";
import officersSlice from "./officers";
import sessionsSlice from "./sessions";
import meetingsSlice from "./meetingsSlice";
import calendarAccountsSlice from "./calendarAccounts";
import webexAccountsSlice from "./webexAccounts";
import timeZonesSlice from "./timeZones";
import groupsSlice from "./groups";
import imatMeetingsSlice from "./imatMeetings";
import imatBreakoutsSlice from "./imatBreakouts";
import imatMeetingAttendanceSlice from "./imatMeetingAttendance";
import imatBreakoutAttendanceSlice from "./imatBreakoutAttendance";
import webexMeetingsSlice from "./webexMeetingsSlice";
import ieee802WorldSlice from "./ieee802World";

// Change the version number with a breaking change in the store structure
const version = 4;

const RESET_STORE_ACTION = "root/RESET_STORE";

const dataAppSliceNames = [
	membersSlice.name,
	groupsSlice.name,
	officersSlice.name,
	sessionsSlice.name,
	meetingsSlice.name,
	webexMeetingsSlice.name,
	imatMeetingsSlice.name,
	imatBreakoutsSlice.name,
	imatBreakoutAttendanceSlice.name,
	imatMeetingAttendanceSlice.name,
	ieee802WorldSlice.name,
	calendarAccountsSlice.name,
	webexAccountsSlice.name
];

/*
 * For the dataApp slices (anything that maintains a 'loading' state)
 * clear the loading state when restoring from cache.
 */
const transformState = createTransform(
	(state: any) => {
		const { loading, ...rest } = state;
		return rest;
	},
	(state) => {
		return { ...state, loading: false };
	},
	{ whitelist: dataAppSliceNames }
);

const appReducer = combineReducers({
	[errorsSlice.name]: errorsSlice.reducer,
	[userSlice.name]: userSlice.reducer,
	[timeZonesSlice.name]: timeZonesSlice.reducer,
	[groupsSlice.name]: groupsSlice.reducer,
	[currentSlice.name]: currentSlice.reducer,
	[membersSlice.name]: membersSlice.reducer,
	[officersSlice.name]: officersSlice.reducer,
	[webexAccountsSlice.name]: webexAccountsSlice.reducer,
	[calendarAccountsSlice.name]: calendarAccountsSlice.reducer,
	[sessionsSlice.name]: sessionsSlice.reducer,
	[meetingsSlice.name]: meetingsSlice.reducer,
	[webexMeetingsSlice.name]: webexMeetingsSlice.reducer,
	[imatMeetingsSlice.name]: imatMeetingsSlice.reducer,
	[imatBreakoutsSlice.name]: imatBreakoutsSlice.reducer,
	[imatBreakoutAttendanceSlice.name]: imatBreakoutAttendanceSlice.reducer,
	[imatMeetingAttendanceSlice.name]: imatMeetingAttendanceSlice.reducer,
	[ieee802WorldSlice.name]: ieee802WorldSlice.reducer,
});

const rootReducer = (state: any, action: Action) => {
	if (action.type === RESET_STORE_ACTION) state = undefined;
	return appReducer(state, action);
};

const middleware: Middleware[] = [];
if (process.env.NODE_ENV !== "production")
	middleware.push(createLogger({ collapsed: true }));

const persistConfig = {
	key: "meetings",
	version,
	storage: {
		// IndexedDB for storage using idb-keyval
		setItem: set,
		getItem: get,
		removeItem: del,
	},
	whitelist: [
		userSlice.name,
		timeZonesSlice.name,
		groupsSlice.name,
		currentSlice.name,
		membersSlice.name,
		officersSlice.name,
		webexAccountsSlice.name,
		calendarAccountsSlice.name,
		sessionsSlice.name,
		meetingsSlice.name,
		webexMeetingsSlice.name,
		imatMeetingsSlice.name,
		imatBreakoutsSlice.name,
		ieee802WorldSlice.name,
	],
	transforms: [transformState],
	stateReconciler: autoMergeLevel2,
	migrate: (state: any) => {
		if (state && state._persist && state._persist.version !== version)
			return Promise.reject("Discard old version");
		return Promise.resolve(state);
	},
};

export const store = configureReduxStore({
	reducer: persistReducer(persistConfig, rootReducer as any),
	middleware: (getDefaultMiddleware) =>
		getDefaultMiddleware({
			immutableCheck: false,
			serializableCheck: false,
		}).concat(middleware),
});

export const persistor = persistStore(store);

export const resetStore = (): Action => ({ type: RESET_STORE_ACTION });

// Infer the `RootState` and `AppDispatch` types from the store itself
type StoreType = typeof store;
export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = StoreType["dispatch"];
export type AppThunk<ReturnType = void> = ThunkAction<
	Promise<ReturnType>,
	RootState,
	unknown,
	Action
>;
