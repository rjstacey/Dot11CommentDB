import { createSlice, createEntityAdapter } from "@reduxjs/toolkit";

import type {
	EntityId,
	EntityState,
	EntityAdapter,
	IdSelector,
	Comparer,
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

//type Dictionary<T> = Record<EntityId, T>;

export type GetEntityField<T extends {} = Record<string, any>> = (
	entity: T,
	dataKey: string,
) => any;

export const FieldType = {
	STRING: "STRING",
	NUMERIC: "NUMERIC",
	CLAUSE: "CLAUSE",
	DATE: "DATE",
} as const;
export type FieldTypeKey = keyof typeof FieldType;
export type FieldTypeValue = (typeof FieldType)[FieldTypeKey];

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

export type AppTableDataState<T, Id extends EntityId> = EntityState<T, Id> &
	LoadingState &
	SelectedState<Id> &
	ExpandedState<Id> &
	FiltersState &
	SortsState &
	UiState;

type O0<S, Id extends EntityId> = {
	selectIds?: (state: S) => Id[];
};
type O1<S, T1 extends {}, Id extends EntityId> = O0<S, Id> & {
	getField?: GetEntityField<T1>;
};
type O2<S, T1 extends {}, T2 extends T1, Id extends EntityId> = O0<S, Id> & {
	selectEntities: (state: S) => Record<Id, T2>;
	getField?: GetEntityField<T2>;
};

type R0<S, T1 extends {}, Id extends EntityId> = {
	selectState: (state: S) => AppTableDataState<T1, Id>;
	selectIds: (state: S) => Id[];
	selectSortedIds: (state: S) => Id[];
	selectFilteredIds: (state: S) => Id[];
	selectSortedFilteredIds: (state: S) => Id[];
} & ReturnType<typeof getSelectedSelectors<S>> &
	ReturnType<typeof getExpandedSelectors<S>> &
	ReturnType<typeof getFiltersSelectors<S>> &
	ReturnType<typeof getSortsSelectors<S>> &
	ReturnType<typeof getUiSelectors<S>>;

type R1<S, T1 extends {}, Id extends EntityId> = R0<S, T1, Id> & {
	selectEntities: (state: S) => Record<Id, T1>;
	getField: GetEntityField<T1>;
};

type R2<S, T1 extends {}, T2 extends T1, Id extends EntityId> = R0<
	S,
	T1,
	Id
> & {
	selectEntities: (state: S) => Record<Id, T2>;
	getField: GetEntityField<T2>;
};

export function getAppTableDataSelectors<
	S,
	T1 extends {},
	T2 extends T1,
	Id extends EntityId,
>(selectState: (state: S) => AppTableDataState<T1, Id>): R1<S, T1, Id>;
export function getAppTableDataSelectors<
	S,
	T1 extends {},
	T2 extends T1,
	Id extends EntityId,
>(
	selectState: (state: S) => AppTableDataState<T1, Id>,
	options: O1<S, T1, Id>,
): R1<S, T1, Id>;
export function getAppTableDataSelectors<
	S,
	T1 extends {},
	T2 extends T1,
	Id extends EntityId,
>(
	selectState: (state: S) => AppTableDataState<T1, Id>,
	options: O2<S, T1, T2, Id>,
): R2<S, T1, T2, Id>;
export function getAppTableDataSelectors<
	S,
	T1 extends {},
	T2 extends T1,
	Id extends EntityId,
	O extends undefined | O1<S, T1, Id> | O2<S, T1, T2, Id>,
>(
	/** Selector for the slice state (required) */
	selectState: (state: S) => AppTableDataState<T1, Id>,
	options?: O,
): R2<S, T1, T2, Id> | R1<S, T1, Id> {
	const selectFilters = (state: S) => selectState(state).filters;
	const selectSorts = (state: S) => selectState(state).sorts;

	/** If `selectIds` is not provided, then the default is to return slice `ids` */
	let selectIds = (state: S) => selectState(state).ids;
	if (typeof options?.selectIds !== "undefined")
		selectIds = options.selectIds;

	/** If `selectEntities` is not provided, then default is to return slice `entities` */
	if (options && "selectEntities" in options) {
		const selectEntities = options.selectEntities;
		const getField: GetEntityField<T2> =
			options.getField ||
			((entity: T2, dataKey: string) => entity[dataKey as keyof T2]);

		/** Select array of filtered ids */
		const selectFilteredIds: (state: S) => Id[] = createSelector(
			selectFilters,
			selectEntities,
			selectIds,
			(filters, entities, ids) =>
				filterData(filters, getField, entities, ids),
		);

		/** Select array of sorted ids */
		const selectSortedIds: (state: S) => Id[] = createSelector(
			[selectSorts, selectEntities, selectIds],
			(sorts, entities, ids) => sortData(sorts, getField, entities, ids),
		);

		/** Select array of sorted and filtered ids */
		const selectSortedFilteredIds: (state: S) => Id[] = createSelector(
			[selectSorts, selectEntities, selectFilteredIds],
			(sorts, entities, ids) => sortData(sorts, getField, entities, ids),
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
	} else {
		const selectEntities = (state: S) => selectState(state).entities;
		const getField: GetEntityField<T1> =
			options?.getField ||
			((entity: T1, dataKey: string) => entity[dataKey as keyof T1]);

		/** Select array of filtered ids */
		const selectFilteredIds: (state: S) => Id[] = createSelector(
			selectFilters,
			selectEntities,
			selectIds,
			(filters, entities, ids) =>
				filterData(filters, getField, entities, ids),
		);

		/** Select array of sorted ids */
		const selectSortedIds: (state: S) => Id[] = createSelector(
			[selectSorts, selectEntities, selectIds],
			(sorts, entities, ids) => sortData(sorts, getField, entities, ids),
		);

		/** Select array of sorted and filtered ids */
		const selectSortedFilteredIds: (state: S) => Id[] = createSelector(
			[selectSorts, selectEntities, selectFilteredIds],
			(sorts, entities, ids) => sortData(sorts, getField, entities, ids),
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
}

export type AppTableDataSelectors<
	S = any,
	T1 extends {} = any,
	T2 extends T1 = T1,
	Id extends EntityId = EntityId,
> = ReturnType<typeof getAppTableDataSelectors<S, T1, T2, Id>>;

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
	T extends {},
	Id extends EntityId,
	ExtraState extends {},
	Reducers extends SliceCaseReducers<ExtraState & AppTableDataState<T, Id>>,
	Name extends string,
>({
	name,
	fields,
	selectId = (entity: unknown) => (entity as { id: Id }).id,
	sortComparer,
	initialState,
	reducers,
	extraReducers,
}: {
	name: Name;
	fields: Fields;
	selectId?: IdSelector<T, Id>;
	sortComparer?: Comparer<T>;
	initialState: ExtraState;
	reducers: ValidateSliceCaseReducers<
		ExtraState & AppTableDataState<T, Id>,
		Reducers
	>;
	extraReducers?: (
		builder: ActionReducerMapBuilder<ExtraState & AppTableDataState<T, Id>>,
		dataAdapter: EntityAdapter<T, Id>,
	) => void;
}) {
	const dataAdapter = createEntityAdapter<T, Id>(
		Object.assign({ selectId }, sortComparer ? { sortComparer } : {}),
	);

	const selectedSubslice = createSelectedSubslice<Id>(name);
	const expandedSubslice = createExpandedSubslice<Id>(name);
	const filtersSubslice = createFiltersSubslice(name, fields);
	const sortsSubslice = createSortsSubslice(name, fields);
	const uiSubslice = createUiSubslice(name);

	const entityReducers: {
		/** Indicate that a data set load is pending (flag as `loading`) */
		getPending(state: AppTableDataState<T, Id>): void;
		/** Load data set load and indicate successful (flag as `valid` and not `loading`) */
		getSuccess(
			state: AppTableDataState<T, Id>,
			action: PayloadAction<T[]>,
		): void;
		/** Data set load failed (flag as not `loading`) */
		getFailure(state: AppTableDataState<T, Id>): void;
		setAll(state: EntityState<T, Id>, action: PayloadAction<T[]>): void;
		setOne(state: EntityState<T, Id>, action: PayloadAction<T>): void;
		setMany(state: EntityState<T, Id>, action: PayloadAction<T[]>): void;
		addOne(state: EntityState<T, Id>, action: PayloadAction<T>): void;
		addMany(state: EntityState<T, Id>, action: PayloadAction<T[]>): void;
		updateOne(
			state: EntityState<T, Id>,
			action: PayloadAction<Update<T, Id>>,
		): void;
		updateMany(
			state: EntityState<T, Id>,
			action: PayloadAction<Update<T, Id>[]>,
		): void;
		upsertOne(state: EntityState<T, Id>, action: PayloadAction<T>): void;
		upsertMany(state: EntityState<T, Id>, action: PayloadAction<T[]>): void;
		removeOne(state: EntityState<T, Id>, action: PayloadAction<Id>): void;
		removeMany(
			state: EntityState<T, Id>,
			action: PayloadAction<Id[]>,
		): void;
		removeAll(state: EntityState<T, Id>): void;
	} = {
		getPending(state) {
			state.loading = true;
		},
		getSuccess(
			state: AppTableDataState<T, Id>,
			action: PayloadAction<T[]>,
		) {
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
		}) as ExtraState & AppTableDataState<T, Id>,
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
			builder: ActionReducerMapBuilder<
				ExtraState & AppTableDataState<T, Id>
			>,
		) => {
			selectedSubslice.extraReducers(builder);
			expandedSubslice.extraReducers(builder);
			if (extraReducers) extraReducers(builder, dataAdapter);
		},
	});

	return slice;
}

export type AppTableDataActions<
	T extends {} = any,
	Id extends EntityId = EntityId,
> = ReturnType<
	typeof createAppTableDataSlice<T, Id, {}, {}, string>
>["actions"];
