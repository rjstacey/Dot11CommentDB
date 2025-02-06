import {
	combineReducers,
	configureStore as configureReduxStore,
	isPlainObject,
} from "@reduxjs/toolkit";
import type { Action, ThunkAction, Middleware } from "@reduxjs/toolkit";
import { createLogger } from "redux-logger";
import {
	persistStore,
	persistReducer,
	createTransform,
	PersistConfig,
} from "redux-persist";
import autoMergeLevel2 from "redux-persist/lib/stateReconciler/autoMergeLevel2";
import { get, set, del } from "idb-keyval";

import { errorsSlice } from "dot11-components";

import userSlice from "./user";
import groupsSlice from "./groups";

// Change the version number with a breaking change in the store structure
const version = 1;

const RESET_STORE_ACTION = "root/RESET_STORE";

const dataAppSliceNames = [groupsSlice.name];

/*
 * For the dataApp slices (anything that maintains a 'loading' state)
 * clear the loading state when restoring from cache.
 */
type GenericObject = { [x: string]: unknown };
const isGenericObject = (o: unknown): o is GenericObject => isPlainObject(o);
const transformState = createTransform(
	(state) => {
		if (!isGenericObject(state)) return state;
		const { loading, ...rest } = state;
		return rest;
	},
	(state: GenericObject) => {
		return { ...state, loading: false };
	},
	{ whitelist: dataAppSliceNames }
);

const appReducer = combineReducers({
	[errorsSlice.name]: errorsSlice.reducer,
	[userSlice.name]: userSlice.reducer,
	[groupsSlice.name]: groupsSlice.reducer,
});

const rootReducer = (
	state: ReturnType<typeof appReducer> | undefined,
	action: Action<unknown>
) => {
	if (action.type === RESET_STORE_ACTION) state = undefined;
	return appReducer(state, action);
};

const middleware: Middleware[] = [];
if (process.env.NODE_ENV !== "production")
	middleware.push(createLogger({ collapsed: true }) as Middleware);

const persistConfig: PersistConfig<ReturnType<typeof appReducer>> = {
	key: "meetings",
	version,
	storage: {
		// IndexedDB for storage using idb-keyval
		setItem: set,
		getItem: get,
		removeItem: del,
	},
	whitelist: [userSlice.name, groupsSlice.name],
	transforms: [transformState],
	stateReconciler: autoMergeLevel2,
	migrate: (state) => {
		if (state && state._persist && state._persist.version !== version)
			return Promise.reject("Discard old version");
		return Promise.resolve(state);
	},
};

export const store = configureReduxStore({
	reducer: persistReducer(persistConfig, rootReducer),
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
