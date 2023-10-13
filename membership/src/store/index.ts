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

import { createUserSlice, User } from "./user";
import groupsSlice, { initGroups } from "./groups";
import timeZonesSlice, { loadTimeZones } from "./timeZones";
import permissionsSlice from "./permissions";
import membersSlice, { loadMembers } from "./members";
import officersSlice, { loadOfficers } from "./officers";
import attendancesSlice, { loadAttendances } from "./sessionParticipation";
import ballotParticipationSlice, {
	loadBallotParticipation,
} from "./ballotParticipation";
import sessionAttendeesSlice from "./sessionAttendees";
import imatCommitteesSlice from "./imatCommittees";
import sessionsSlice, { loadSessions } from "./sessions";
import emailTemlatesSlice, { loadEmailTemplates } from "./email";

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

function configureStore(user: User) {
	const userSlice = createUserSlice(user);

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

	const store = configureReduxStore({
		reducer: persistReducer(persistConfig, rootReducer as any),
		middleware: (getDefaultMiddleware) =>
			getDefaultMiddleware({
				immutableCheck: false,
				serializableCheck: false,
			}).concat(middleware),
	});

	const persistor = persistStore(store, null, () => {
		store.dispatch(initGroups());
		store.dispatch(loadTimeZones());
		store.dispatch(loadMembers());
		store.dispatch(loadSessions());
		store.dispatch(loadOfficers());
		store.dispatch(loadAttendances());
		store.dispatch(loadBallotParticipation());
		store.dispatch(loadEmailTemplates());
	});

	return { store, persistor, reducer: rootReducer };
}

export const resetStore = (): Action => ({ type: RESET_STORE_ACTION });

// Infer the `RootState` and `AppDispatch` types from the store itself
type StoreType = ReturnType<typeof configureStore>["store"];
export type RootState = ReturnType<
	ReturnType<typeof configureStore>["reducer"]
>;
export type AppDispatch = StoreType["dispatch"];
export type AppThunk<ReturnType = void> = ThunkAction<
	Promise<ReturnType>,
	RootState,
	unknown,
	AnyAction
>;

export default configureStore;
