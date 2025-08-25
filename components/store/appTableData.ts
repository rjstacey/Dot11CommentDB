import { createSlice, createEntityAdapter } from "@reduxjs/toolkit";

import type {
	EntityId,
	EntityState,
	EntityAdapter,
	IdSelector,
	Comparer,
	//Dictionary,
	Update,
	PayloadAction,
	SliceCaseReducers,
	ValidateSliceCaseReducers,
	ActionReducerMapBuilder,
} from "@reduxjs/toolkit";

import { createSelector } from "reselect"; /* Use older version; the newer version does not handle typescript generics well */

import {
	createSelectedSubslice,
	getSelectedSelectors,
	SelectedState,
} from "./selected";
import {
	createExpandedSubslice,
	getExpandedSelectors,
	ExpandedState,
} from "./expanded";
import {
	createFiltersSubslice,
	getFiltersSelectors,
	FiltersState,
	filterData,
} from "./filters";
import {
	createSortsSubslice,
	getSortsSelectors,
	SortsState,
	sortData,
	SortDirectionValue,
} from "./sorts";
import { createUiSubslice, getUiSelectors, UiState } from "./ui";

//export * from './selected';
//export * from './expanded';
export * from "./filters";
export * from "./sorts";
export * from "./ui";

//export { EntityId, Dictionary };

type Dictionary<T = any> = Record<EntityId, T>;

export type GetEntityField<T = any> = (entity: T, dataKey: string) => any;

export const FieldType = {
	STRING: "STRING",
	NUMERIC: "NUMERIC",
	CLAUSE: "CLAUSE",
	DATE: "DATE",
} as const;
export type FieldTypeKey = keyof typeof FieldType;
export type FieldTypeValue = typeof FieldType[FieldTypeKey];

export type Option = {
	value: any;
	label: string;
};

export type FieldProperties = {
	label?: string;
	type?: FieldTypeValue;
	sortDirection?: SortDirectionValue;
	dontSort?: boolean;
	dontFilter?: boolean;
	options?: Option[];
	dataRenderer?: (value: any) => string | number;
};

export type Fields = {
	[dataKey: string]: FieldProperties;
};

type LoadingState = {
	loading: boolean;
	valid: boolean;
};

export type AppTableDataState<T> = EntityState<T> &
	LoadingState &
	SelectedState &
	ExpandedState &
	FiltersState &
	SortsState &
	UiState;

export type AppTableDataSelectorOptions<S, T2> = {
	/** Optionally override the entities selector; allows for table join operations etc. */
	selectEntities?: (state: S) => Dictionary<T2>;
	/** Optionally override the ids selector; allows for pre-filtering of table entires */
	selectIds?: (state: S) => EntityId[];
	/** Optional function that will derive a field `dataKey` from other fields */
	getField?: (entity: T2, dataKey: string) => any;
};

export function getAppTableDataSelectors<S, T1, T2>(
	/** Selector for the slice state (required) */
	selectState: (state: S) => AppTableDataState<T1>,
	options?: AppTableDataSelectorOptions<S, T2>
) {
	const selectFilters = (state: S) => selectState(state).filters;
	const selectSorts = (state: S) => selectState(state).sorts;

	/** If `selectIds` is not provided, then the default is to return slice `ids` */
	let selectIds = (state: S) => selectState(state).ids;
	if (options && typeof options.selectIds !== "undefined")
		selectIds = options.selectIds;

	/** If `selectEntities` is not provided, then default is to return slice `entities` */
	function selectEntities(state: S): Dictionary<T1>;
	function selectEntities(state: S): Dictionary<T2>;
	function selectEntities(state: S) {
		if (options && options.selectEntities)
			return options.selectEntities(state);
		return selectState(state).entities;
	}

	function getField(entity: T1, dataKey: string): any;
	function getField(entity: T2, dataKey: string): any;
	function getField(entity: unknown, dataKey: string) {
		if (options && options.getField)
			return options.getField(entity as T2, dataKey);
		return (entity as T1)[dataKey];
	}

	/** Select array of filtered ids */
	const selectFilteredIds: (state: S) => EntityId[] = createSelector(
		selectFilters,
		selectEntities,
		selectIds,
		(filters, entities, ids) =>
			filterData(filters, getField!, entities, ids)
	);

	/** Select array of sorted ids */
	const selectSortedIds: (state: S) => EntityId[] = createSelector(
		[selectSorts, selectEntities, selectIds],
		(sorts, entities, ids) => sortData(sorts, getField!, entities, ids)
	);

	/** Select array of sorted and filtered ids */
	const selectSortedFilteredIds: (state: S) => EntityId[] = createSelector(
		[selectSorts, selectEntities, selectFilteredIds],
		(sorts, entities, ids) => sortData(sorts, getField!, entities, ids)
	);

	return {
		getField,
		selectState,
		selectIds,
		selectEntities,
		selectSortedIds,
		selectFilteredIds,
		selectSortedFilteredIds,
		...getSelectedSelectors(selectState),
		...getExpandedSelectors(selectState),
		...getFiltersSelectors(selectState),
		...getSortsSelectors(selectState),
		...getUiSelectors(selectState),
	};
}

export type AppTableDataSelectors<S = any, T1 = any, T2 = any> = ReturnType<typeof getAppTableDataSelectors<S, T1, T2>>;

/*
 * Create a redux slice suitible for AppTable rendering.
 *
 * Data entries are managed through the redux toolkit dataAdapter.
 *
 * The selected subslice manages an array of ids representing selected data rows
 * The expanded subslice manages an array of ids representing expanded data rows (row height depends on content vs fixed row height)
 * The filters subslice manages the column filters
 * The sorts subslice manages the column sorts
 * The ui subslice manages the table settings (fixed, column widths, column shown/hidden, etc.)
 */
export function createAppTableDataSlice<
	T = any,
	ExtraState = {},
	Reducers extends SliceCaseReducers<
		ExtraState & AppTableDataState<T>
	> = SliceCaseReducers<ExtraState & AppTableDataState<T>>,
	Name extends string = string
>({
	name,
	fields,
	selectId = (entity: T) => entity["id"],
	sortComparer,
	initialState,
	reducers,
	extraReducers,
}: {
	name: Name;
	fields: Fields;
	selectId?: IdSelector<T>;
	sortComparer?: Comparer<T>;
	initialState: ExtraState;
	reducers: ValidateSliceCaseReducers<
		ExtraState & AppTableDataState<T>,
		Reducers
	>;
	extraReducers?: (
		builder: ActionReducerMapBuilder<ExtraState & AppTableDataState<T>>,
		dataAdapter: EntityAdapter<T>
	) => void;
}) {
	const dataAdapter = createEntityAdapter<T>(
		Object.assign(
			{ selectId },
			sortComparer ? { sortComparer } : {}
		)
	);

	const selectedSubslice = createSelectedSubslice(name);
	const expandedSubslice = createExpandedSubslice(name);
	const filtersSubslice = createFiltersSubslice(name, fields);
	const sortsSubslice = createSortsSubslice(name, fields);
	const uiSubslice = createUiSubslice(name);

	const entityReducers: {
		/** Indicate that a data set load is pending (flag as `loading`) */
		getPending(state: AppTableDataState<T>): void;
		/** Load data set load and indicate successful (flag as `valid` and not `loading`) */
		getSuccess(
			state: AppTableDataState<T>,
			action: PayloadAction<T[]>
		): void;
		/** Data set load failed (flag as not `loading`) */
		getFailure(state: AppTableDataState<T>): void;
		setAll(state: EntityState<T>, action: PayloadAction<T[]>): void;
		setOne(state: EntityState<T>, action: PayloadAction<T>): void;
		setMany(state: EntityState<T>, action: PayloadAction<T[]>): void;
		addOne(state: EntityState<T>, action: PayloadAction<T>): void;
		addMany(state: EntityState<T>, action: PayloadAction<T[]>): void;
		updateOne(
			state: EntityState<T>,
			action: PayloadAction<Update<T>>
		): void;
		updateMany(
			state: EntityState<T>,
			action: PayloadAction<Update<T>[]>
		): void;
		upsertOne(state: EntityState<T>, action: PayloadAction<T>): void;
		upsertMany(state: EntityState<T>, action: PayloadAction<T[]>): void;
		removeOne(state: EntityState<T>, action: PayloadAction<EntityId>): void;
		removeMany(
			state: EntityState<T>,
			action: PayloadAction<EntityId[]>
		): void;
		removeAll(state: EntityState<T>): void;
	} = {
		getPending(state) {
			state.loading = true;
		},
		getSuccess(state, action) {
			state.loading = false;
			state.valid = true;
			dataAdapter.setAll(state, action.payload);
		},
		getFailure(state) {
			state.loading = false;
		},

		setAll: dataAdapter.setAll,
		setOne: dataAdapter.setOne,
		setMany: dataAdapter.setMany,

		addOne: dataAdapter.addOne,
		addMany: dataAdapter.addMany,

		updateOne: dataAdapter.updateOne,
		updateMany: dataAdapter.updateMany,

		upsertOne: dataAdapter.upsertOne,
		upsertMany: dataAdapter.upsertMany,

		removeOne: dataAdapter.removeOne,
		removeMany: dataAdapter.removeMany,
		removeAll: dataAdapter.removeAll,
	};

	const slice = createSlice({
		name,
		initialState: dataAdapter.getInitialState({
			loading: false,
			valid: false,
			...selectedSubslice.initialState,
			...expandedSubslice.initialState,
			...filtersSubslice.initialState,
			...sortsSubslice.initialState,
			...uiSubslice.initialState,
			...initialState,
		}) as ExtraState & AppTableDataState<T>,
		reducers: {
			...reducers,
			...entityReducers,
			...selectedSubslice.reducers,
			...expandedSubslice.reducers,
			...filtersSubslice.reducers,
			...sortsSubslice.reducers,
			...uiSubslice.reducers,
		},
		extraReducers: (
			builder: ActionReducerMapBuilder<ExtraState & AppTableDataState<T>>
		) => {
			selectedSubslice.extraReducers(builder);
			expandedSubslice.extraReducers(builder);
			if (extraReducers) extraReducers(builder, dataAdapter);
		},
	});

	return slice;
}

export type AppTableDataActions<T = any> = ReturnType<typeof createAppTableDataSlice<T>>['actions'];
