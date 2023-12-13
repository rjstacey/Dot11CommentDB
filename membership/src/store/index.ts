import {
	combineReducers,
	configureStore as configureReduxStore,
} from "@reduxjs/toolkit";
import type {
	Action,
	ThunkAction,
	AnyAction,
	Middleware,
} from "@reduxjs/toolkit";

import { createLogger } from "redux-logger";
import { persistStore, persistReducer, createTransform } from "redux-persist";
import autoMergeLevel2 from "redux-persist/lib/stateReconciler/autoMergeLevel2";
import { get, set, del } from "idb-keyval";

import userSlice from "./user";
import groupsSlice from "./groups";
import timeZonesSlice from "./timeZones";
import permissionsSlice from "./permissions";
import membersSlice from "./members";
import officersSlice from "./officers";
import attendancesSlice from "./sessionParticipation";
import ballotParticipationSlice from "./ballotParticipation";
import sessionAttendeesSlice from "./sessionAttendees";
import imatCommitteesSlice from "./imatCommittees";
import sessionsSlice from "./sessions";
import emailTemlatesSlice from "./email";

import { errorsSlice } from "dot11-components";

const RESET_STORE_ACTION = "root/RESET_STORE";
const PERSIST_VERSION = 4;

const transformState = createTransform(
	(state: any) => {
		const { loading, ...rest } = state;
		return rest;
	},
	(state) => ({ ...state, loading: false }),
	{
		whitelist: [
			membersSlice.name,
			groupsSlice.name,
			officersSlice.name,
			attendancesSlice.name,
			ballotParticipationSlice.name,
			emailTemlatesSlice.name,
		],
	}
);

const appReducer = combineReducers({
	[userSlice.name]: userSlice.reducer,
	[groupsSlice.name]: groupsSlice.reducer,
	[membersSlice.name]: membersSlice.reducer,
	[sessionsSlice.name]: sessionsSlice.reducer,
	[officersSlice.name]: officersSlice.reducer,
	[attendancesSlice.name]: attendancesSlice.reducer,
	[ballotParticipationSlice.name]: ballotParticipationSlice.reducer,
	[timeZonesSlice.name]: timeZonesSlice.reducer,
	[permissionsSlice.name]: permissionsSlice.reducer,
	[errorsSlice.name]: errorsSlice.reducer,
	[sessionAttendeesSlice.name]: sessionAttendeesSlice.reducer,
	[imatCommitteesSlice.name]: imatCommitteesSlice.reducer,
	[emailTemlatesSlice.name]: emailTemlatesSlice.reducer,
});

const rootReducer = (state: any, action: AnyAction) => {
	if (action.type === RESET_STORE_ACTION) state = undefined;
	return appReducer(state, action);
};

const persistConfig = {
	key: "membership",
	version: PERSIST_VERSION,
	storage: {
		// IndexedDB for storage using idb-keyval
		setItem: set,
		getItem: get,
		removeItem: del,
	},
	whitelist: [
		groupsSlice.name,
		membersSlice.name,
		attendancesSlice.name,
		ballotParticipationSlice.name,
		emailTemlatesSlice.name,
	],
	stateReconciler: autoMergeLevel2,
	transforms: [transformState],
	migrate: (state: any) => {
		if (
			state &&
			state._persist &&
			state._persist.version !== PERSIST_VERSION
		)
			return Promise.reject("Discard old version");
		return Promise.resolve(state);
	},
};

const middleware: Middleware[] = []; //[thunk];
if (process.env.NODE_ENV !== "production")
	middleware.push(createLogger({ collapsed: true }));

export const store = configureReduxStore({
	reducer: persistReducer(persistConfig, rootReducer as any),
	middleware: (getDefaultMiddleware) =>
		getDefaultMiddleware({
			immutableCheck: false,
			serializableCheck: false,
		}).concat(middleware),
});

export const persistor = persistStore(store, null);

export const resetStore = (): Action => ({ type: RESET_STORE_ACTION });

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;
export type AppThunk<ReturnType = void> = ThunkAction<
	Promise<ReturnType>,
	RootState,
	unknown,
	AnyAction
>;
