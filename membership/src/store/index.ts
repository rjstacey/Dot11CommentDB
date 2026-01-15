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
import createIdbStorage from "@piotr-cz/redux-persist-idb-storage";

import groupsSlice from "./groups";
import timeZonesSlice from "./timeZones";
import membersSlice from "./members";
import ieeeMembersSlice from "./ieeeMembers";
import officersSlice from "./officers";
import attendanceSummariesSlice from "./attendanceSummaries";
import attendancesSlice from "./sessionParticipation";
import ballotParticipationSlice from "./ballotParticipation";
import imatAttendanceSummarySlice from "./imatAttendanceSummary";
import sessionAttendanceSummarySlice from "./sessionAttendanceSummary";
import sessionRegistrationSlice from "./sessionRegistration";
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

const storage = createIdbStorage({
	name: "802tools",
	storeName: "membership",
});

/* Transform presistant state so that we reset "loading" state */
type GenericObject = Record<string, unknown>;
const transformState = createTransform((state: GenericObject) => {
	const { loading, ...rest } = state;
	return rest;
});

const appReducer = combineReducers({
	[userSlice.name]: userSlice.reducer,
	[groupsSlice.name]: groupsSlice.reducer,
	[membersSlice.name]: membersSlice.reducer,
	[ieeeMembersSlice.name]: ieeeMembersSlice.reducer,
	[sessionsSlice.name]: sessionsSlice.reducer,
	[officersSlice.name]: officersSlice.reducer,
	[attendanceSummariesSlice.name]: attendanceSummariesSlice.reducer,
	[attendancesSlice.name]: attendancesSlice.reducer,
	[ballotParticipationSlice.name]: ballotParticipationSlice.reducer,
	[imatAttendanceSummarySlice.name]: imatAttendanceSummarySlice.reducer,
	[imatCommitteesSlice.name]: imatCommitteesSlice.reducer,
	[sessionAttendanceSummarySlice.name]: sessionAttendanceSummarySlice.reducer,
	[sessionRegistrationSlice.name]: sessionRegistrationSlice.reducer,
	[timeZonesSlice.name]: timeZonesSlice.reducer,
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
	storage,
	whitelist: [
		userSlice.name,
		groupsSlice.name,
		membersSlice.name,
		ieeeMembersSlice.name,
		sessionsSlice.name,
		officersSlice.name,
		attendanceSummariesSlice.name,
		attendancesSlice.name,
		ballotParticipationSlice.name,
		imatAttendanceSummarySlice.name,
		imatCommitteesSlice.name,
		sessionAttendanceSummarySlice.name,
		sessionRegistrationSlice.name,
		timeZonesSlice.name,
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
