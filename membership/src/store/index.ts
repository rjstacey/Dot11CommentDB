import {
	combineReducers,
	configureStore as configureReduxStore,
} from "@reduxjs/toolkit";
import type { Action, ThunkAction, Middleware } from "@reduxjs/toolkit";
import { createLogger } from "redux-logger";
import {
	persistStore,
	persistReducer,
	createTransform,
	type PersistConfig,
} from "redux-persist";
import autoMergeLevel2 from "redux-persist/lib/stateReconciler/autoMergeLevel2";
import { get, set, del } from "idb-keyval";

import groupsSlice from "./groups";
import timeZonesSlice from "./timeZones";
import membersSlice from "./members";
import ieeeMembersSlice from "./ieeeMembers";
import officersSlice from "./officers";
import attendanceSummarySlice from "./attendanceSummary";
import attendancesSlice from "./sessionParticipation";
import ballotParticipationSlice from "./ballotParticipation";
import sessionAttendeesSlice from "./sessionAttendees";
import sessionRegistratonSlice from "./sessionRegistration";
import imatCommitteesSlice from "./imatCommittees";
import sessionsSlice from "./sessions";
import emailTemlatesSlice from "./emailTemplates";
import affliationMapSlice from "./affiliationMap";
import myProjectRosterSlice from "./myProjectRoster";
import {
	errorsSlice,
	userSlice,
	createPersistReady,
	RESET_STORE_ACTION,
} from "@common";

export { setError, setUser, selectUser, resetStore, type User } from "@common";

const PERSIST_VERSION = 4;

/* Transform presistant state so that we reset "loading" state */
type GenericObject = Record<string, unknown>;
const transformState = createTransform(
	(state: GenericObject) => {
		const { loading, ...rest } = state;
		return rest;
	},
	(state: GenericObject) => ({ ...state, loading: false }),
	{
		whitelist: [
			membersSlice.name,
			ieeeMembersSlice.name,
			groupsSlice.name,
			officersSlice.name,
			attendanceSummarySlice.name,
			attendancesSlice.name,
			ballotParticipationSlice.name,
			sessionAttendeesSlice.name,
			sessionRegistratonSlice.name,
			emailTemlatesSlice.name,
			affliationMapSlice.name,
			myProjectRosterSlice.name,
		],
	}
);

const appReducer = combineReducers({
	[userSlice.name]: userSlice.reducer,
	[groupsSlice.name]: groupsSlice.reducer,
	[membersSlice.name]: membersSlice.reducer,
	[ieeeMembersSlice.name]: ieeeMembersSlice.reducer,
	[sessionsSlice.name]: sessionsSlice.reducer,
	[officersSlice.name]: officersSlice.reducer,
	[attendanceSummarySlice.name]: attendanceSummarySlice.reducer,
	[attendancesSlice.name]: attendancesSlice.reducer,
	[ballotParticipationSlice.name]: ballotParticipationSlice.reducer,
	[sessionAttendeesSlice.name]: sessionAttendeesSlice.reducer,
	[sessionRegistratonSlice.name]: sessionRegistratonSlice.reducer,
	[timeZonesSlice.name]: timeZonesSlice.reducer,
	[imatCommitteesSlice.name]: imatCommitteesSlice.reducer,
	[emailTemlatesSlice.name]: emailTemlatesSlice.reducer,
	[affliationMapSlice.name]: affliationMapSlice.reducer,
	[myProjectRosterSlice.name]: myProjectRosterSlice.reducer,
	[errorsSlice.name]: errorsSlice.reducer,
});

const rootReducer = (
	state: ReturnType<typeof appReducer> | undefined,
	action: Action<unknown>
) => {
	if (action.type === RESET_STORE_ACTION) state = undefined;
	return appReducer(state, action);
};

const persistConfig: PersistConfig<ReturnType<typeof appReducer>> = {
	key: "membership",
	version: PERSIST_VERSION,
	storage: {
		// IndexedDB for storage using idb-keyval
		setItem: set,
		getItem: get,
		removeItem: del,
	},
	whitelist: [
		userSlice.name,
		groupsSlice.name,
		membersSlice.name,
		ieeeMembersSlice.name,
		sessionsSlice.name,
		officersSlice.name,
		attendanceSummarySlice.name,
		attendancesSlice.name,
		ballotParticipationSlice.name,
		sessionAttendeesSlice.name,
		sessionRegistratonSlice.name,
		timeZonesSlice.name,
		imatCommitteesSlice.name,
		emailTemlatesSlice.name,
		affliationMapSlice.name,
		myProjectRosterSlice.name,
	],
	stateReconciler: autoMergeLevel2,
	transforms: [transformState],
	migrate: (state) => {
		if (
			state &&
			state._persist &&
			state._persist.version !== PERSIST_VERSION
		)
			return Promise.reject("Discard old version");
		return Promise.resolve(state);
	},
};

const middleware: Middleware[] = [];
if (process.env.NODE_ENV !== "production")
	middleware.push(createLogger({ collapsed: true }) as Middleware);

export const store = configureReduxStore({
	reducer: persistReducer(persistConfig, rootReducer),
	middleware: (getDefaultMiddleware) =>
		getDefaultMiddleware({
			immutableCheck: false,
			serializableCheck: false,
		}).concat(middleware),
});

export const persistor = persistStore(store);
export const persistReady = createPersistReady(persistor);

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;
export type AppThunk<ReturnType = void> = ThunkAction<
	Promise<ReturnType>,
	RootState,
	unknown,
	Action
>;
