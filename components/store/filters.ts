// filter.js - filter utility
//
// Began life here https://github.com/koalyptus/TableFilter
//
import type { PayloadAction, EntityId } from "@reduxjs/toolkit";
import {
	Fields,
	FieldProperties,
	Option,
	GetEntityField,
	FieldType,
	FieldTypeValue,
} from "./appTableData";

export const CompOp = {
	EQ: "EQ",
	GT: "GT",
	LT: "LT",
	GTEQ: "GTEQ",
	LTEQ: "LTEQ",
	NOTEQ: "NOTEQ",
	BLANK: "BLANK",
	NOTBLANK: "NOTBLANK",
	CONTAINS: "CONTAINS",
	REGEX: "REGEX",
	CLAUSE: "CLAUSE",
	PAGE: "PAGE",
} as const;
type CompOpKey = keyof typeof CompOp;
export type CompOpValue = (typeof CompOp)[CompOpKey];

export const globalFilterKey = "__global__";

export type FilterComp = {
	value: any;
	operation: CompOpValue;
};

/** Clause match */
const cmpClause = (d: string | null, val: string) => {
	let len = val.length;
	if (len && val[len - 1] === ".") len = len - 1;
	return (
		d === val ||
		(!!d && d.substring(0, len) === val.substring(0, len) && d[len] === ".")
	);
};

/**
 * Page match:
 * floating point number => match page and line
 * Integer value => match page
 */
const cmpPage = (d: number | null, val: string) => {
	const n = Number(val);
	return val.search(/\d+\./) !== -1 || d === null
		? d === n
		: Math.round(d) === n;
};

const cmpContains = (d: any, val: string) => {
	if (typeof d === "number") d = d.toString();
	if (typeof d !== "string") return false;
	return d.toLocaleLowerCase().includes(val.toLowerCase());
};

type CmpFunc = (d: any) => boolean;

export function getCompFunc(comp: FilterComp): CmpFunc {
	const { value, operation } = comp;
	let regex: RegExp | undefined, parts: string[];

	switch (operation) {
		case CompOp.EQ:
			return (d: any) => d == value; // eslint-disable-line
		case CompOp.GT:
			return (d: any) => d > value;
		case CompOp.LT:
			return (d: any) => d < value;
		case CompOp.GTEQ:
			return (d: any) => d >= value;
		case CompOp.LTEQ:
			return (d: any) => d <= value;
		case CompOp.NOTEQ:
			return (d: any) => d != value; // eslint-disable-line
		case CompOp.BLANK:
			return (d: any) => d === null || d === "";
		case CompOp.NOTBLANK:
			return (d: any) => d !== null && d !== "";
		case CompOp.REGEX:
			parts = value.split("/");
			if (value[0] === "/" && parts.length > 2 && parts[0]) {
				try {
					regex = new RegExp(parts[1], parts[2]);
				} catch (err) {}
			}
			return regex ? regex.test : () => false;
		case CompOp.CONTAINS:
			return (d: any) => cmpContains(d, value);
		case CompOp.CLAUSE:
			return (d: any) => cmpClause(d, value);
		case CompOp.PAGE:
			return (d: any) => cmpPage(d, value);
		default:
			console.error(`Unexpected comp operation ${operation}`);
			return () => false;
	}
}

/*
 * Applies the column filters in turn to the data.
 * Returns a list of ids that meet the filter requirements.
 */
export function filterData<T>(
	filters: Filters,
	getField: GetEntityField<T>,
	entities: Record<EntityId, T>,
	ids: EntityId[]
): EntityId[] {
	let filteredIds = ids.slice();
	const dataKeys = Object.keys(filters).filter(
		(dataKey) => dataKey !== globalFilterKey
	);
	// Apply the column filters
	for (const dataKey of dataKeys) {
		const comps = filters[dataKey].comps;
		if (comps.length > 0) {
			const cmpFuncs = comps.map(getCompFunc);
			filteredIds = filteredIds.filter((id) => {
				const d = getField(entities[id]!, dataKey);
				return cmpFuncs.some((cmpFunc) => cmpFunc(d));
			});
		}
	}
	// Apply the global filter
	if (filters[globalFilterKey]) {
		const comps = filters[globalFilterKey].comps;
		if (comps.length > 0) {
			const cmpFunc = getCompFunc(comps[0]);
			filteredIds = filteredIds.filter((id) =>
				dataKeys.some((dataKey) =>
					cmpFunc(getField(entities[id]!, dataKey))
				)
			);
		}
	}
	return filteredIds;
}

export type Filter = {
	type: FieldTypeValue;
	comps: FilterComp[];
	options?: Option[];
};

export type Filters = {
	[dataKey: string]: Filter;
};

const filterCreate = ({
	options,
	type = FieldType.STRING,
}: FieldProperties): Filter => ({
	type,
	comps: [], // Array of compare objects where a compare object {value, compType}
	options, // Array of {label, value} objects
});

function filtersInit(fields: Fields) {
	const filters: Filters = {};
	for (const [dataKey, field] of Object.entries(fields)) {
		if (!field.dontFilter) filters[dataKey] = filterCreate(field);
	}
	filters[globalFilterKey] = filterCreate({});
	return filters;
}

const name = "filters";

export type FiltersState = { [name]: Filters };

export function createFiltersSubslice(dataSet: string, fields: Fields) {
	const initialState: FiltersState = { [name]: filtersInit(fields) };

	const reducers = {
		setFilter(
			state: FiltersState,
			action: PayloadAction<{ dataKey: string; comps: FilterComp[] }>
		) {
			const filters = state[name];
			const { dataKey, comps } = action.payload;
			const filter = filterCreate(filters[dataKey] || {});
			filter.comps = comps;
			filters[dataKey] = filter;
		},
		addFilter(
			state: FiltersState,
			action: PayloadAction<{ dataKey: string } & FilterComp>
		) {
			const filters = state[name];
			const { dataKey, value, operation } = action.payload;
			filters[dataKey].comps.push({ value, operation });
		},
		removeFilter(
			state: FiltersState,
			action: PayloadAction<{ dataKey: string } & FilterComp>
		) {
			const filters = state[name];
			const { dataKey, value, operation } = action.payload;
			filters[dataKey].comps = filters[dataKey].comps.filter(
				(comp: FilterComp) =>
					comp.value !== value || comp.operation !== operation
			);
		},
		clearFilter(
			state: FiltersState,
			action: PayloadAction<{ dataKey: string }>
		) {
			const filters = state[name];
			const { dataKey } = action.payload;
			filters[dataKey] = filterCreate(filters[dataKey]);
		},
		clearAllFilters(state: FiltersState) {
			state[name] = filtersInit(state[name]);
		},
	};

	return {
		name,
		initialState,
		reducers,
	};
}

export function getFiltersSelectors<S>(
	selectState: (state: S) => FiltersState
) {
	return {
		/** All filters */
		selectFilters: (state: S) => selectState(state)[name],
		/** The filter for `dataKey` */
		selectFilter: (state: S, dataKey: string) =>
			selectState(state)[name][dataKey],
		/** The global filter */
		selectGlobalFilter: (state: S) =>
			selectState(state)[name][globalFilterKey],
	};
}
