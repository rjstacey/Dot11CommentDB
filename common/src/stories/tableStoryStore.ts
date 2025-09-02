import {
	configureStore,
	createSelector,
	ThunkAction,
	Action,
	PayloadAction,
	Middleware,
} from "@reduxjs/toolkit";
import { createLogger } from "redux-logger";
import { useDispatch } from "react-redux";

import { displayDate } from "../lib";

import {
	createAppTableDataSlice,
	getAppTableDataSelectors,
	AppTableDataState,
	Fields,
	FieldType,
} from "../store/appTableData";

import { LoremIpsum } from "lorem-ipsum";

/*
 * Store setup
 */

type NameEntity = {
	id: number;
	Name: string;
};

/* Names slice maps an id to a name */
export const nameFields = {
	id: { label: "id" },
	Name: { label: "Name" },
};

const namesSlice = createAppTableDataSlice({
	name: "names",
	fields: nameFields,
	initialState: {},
	reducers: {},
});

type NamesState = AppTableDataState<NameEntity>;

const statusOptions = [
	{ value: 0, label: "Good" },
	{ value: 1, label: "Bad" },
	{ value: 2, label: "Ugly" },
];

const renderStatus = (v: number) => {
	const o = statusOptions.find((o) => o.value === v);
	return o ? o.label : v;
};

type DataEntity = {
	id: number;
	name_id: number;
	Date: string | null;
	Number: number | null;
	Text: string | null;
	Clause: string | null;
	Status: number;
};

export const dataFields: Fields = {
	id: { label: "ID", type: FieldType.NUMERIC },
	Name: { label: "Name" },
	Date: {
		label: "Date",
		dataRenderer: displayDate,
		type: FieldType.DATE,
	},
	Text: {
		label: "Text",
	},
	Number: {
		label: "Number",
		type: FieldType.NUMERIC,
	},
	Clause: {
		label: "Clause",
		type: FieldType.CLAUSE,
	},
	Status: {
		label: "Status",
		dataRenderer: renderStatus,
		options: statusOptions,
		type: FieldType.NUMERIC,
		dontSort: true,
		dontFilter: true,
	},
	Derived: {
		label: "Derived",
	},
};

const selectField = (data: DataEntity, dataKey: string) => {
	if (dataKey === "Derived") return data.Status + "-es";
	return data[dataKey as keyof DataEntity];
};

const selectNamesEntities = (state: any) =>
	(state["names"] as NamesState).entities;

const selectDataEntities = (state: any) =>
	(state["data"] as DataState).entities;

/* A selector that returns the entities with name_id mapped to Name */
const selectEntities = createSelector(
	[selectNamesEntities, selectDataEntities],
	(namesEntities, dataEntities) => {
		const entities: { [id: string]: DataEntity & { Name: string } } = {};
		for (const [id, entity] of Object.entries(dataEntities)) {
			if (!entity) continue;
			const nameEntity = namesEntities[entity.name_id];
			const Name = nameEntity ? nameEntity.Name : "";
			entities[id] = { ...entity, Name };
		}
		return entities;
	}
);

const initialState = { extra: false };

type DataState = AppTableDataState<DataEntity> & typeof initialState;

const dataSlice = createAppTableDataSlice({
	name: "data",
	fields: dataFields,
	initialState,
	selectId: (entity: DataEntity) => entity.id,
	reducers: {
		setExtra(state, action: PayloadAction<boolean>) {
			state.extra = action.payload;
		},
	},
});

const store = configureStore({
	reducer: {
		names: namesSlice.reducer,
		data: dataSlice.reducer,
	},
	middleware: (getDefaultMiddleware) =>
		getDefaultMiddleware().concat(
			createLogger({ collapsed: true }) as Middleware
		),
	devTools: true,
});

type RootState = ReturnType<typeof store.getState>;
type AppDispatch = typeof store.dispatch;
type AppThunk<ReturnType = void> = ThunkAction<
	ReturnType,
	RootState,
	unknown,
	Action
>;

export const useAppDispatch: () => AppDispatch = useDispatch;
//export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector

export const dataSelectors = getAppTableDataSelectors(
	(state: RootState) => state.data,
	{ selectEntities, getField: selectField }
);
export const dataActions = dataSlice.actions;

function randomDate() {
	if (Math.random() > 0.9) return null;
	const start = new Date(2010, 0, 1);
	const end = new Date();
	return new Date(
		start.getTime() + Math.random() * (end.getTime() - start.getTime())
	).toISOString();
}

const lorem = new LoremIpsum({
	sentencesPerParagraph: { max: 8, min: 4 },
	wordsPerSentence: { max: 16, min: 4 },
});

function randomText() {
	const n = Math.random();
	if (n > 0.95) return null;
	if (n > 0.9) return "";
	return lorem.generateSentences(3);
}

function randomNumber() {
	if (Math.random() > 0.9) return null;
	return Math.round(Math.random() * 5);
}

const randomStatus = () =>
	Math.round(Math.random() * (statusOptions.length - 1));

const MaxNames = 4;

function randomClause() {
	const clauses = [
		null,
		"4",
		"4.1",
		"4.1.1",
		"4.1.2",
		"4.2",
		"4.2.1",
		"4.2.2",
		"5",
	];
	return clauses[Math.round(Math.random() * (clauses.length - 1))];
}

const genData = (n: number): DataEntity[] =>
	new Array(n).fill(true).map((r, i) => ({
		id: i,
		name_id: Math.floor(Math.random() * MaxNames),
		Date: randomDate(),
		Number: randomNumber(),
		Text: randomText(),
		Status: randomStatus(),
		Clause: randomClause(),
	}));

const genNames = (): NameEntity[] =>
	new Array(MaxNames).fill(true).map((r, i) => ({
		id: i,
		Name: Math.random().toString(36).slice(2),
	}));

export const loadData =
	(n = 1000): AppThunk =>
	(dispatch) => {
		const names = genNames();
		dispatch(namesSlice.actions.getSuccess(names));

		const { getPending, getSuccess } = dataSlice.actions;
		dispatch(getPending());
		const data = genData(n);
		setTimeout(() => dispatch(getSuccess(data)), 1000);
	};

export const removeRow = dataSlice.actions.removeOne;

export default store;
