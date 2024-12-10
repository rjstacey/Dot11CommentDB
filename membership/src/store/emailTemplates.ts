import {
	createSlice,
	createEntityAdapter,
	PayloadAction,
} from "@reduxjs/toolkit";
import { fetcher, setError } from "dot11-components";
import type { AppThunk, RootState } from ".";
import {
	emailTemplatesSchema,
	EmailTemplate,
	EmailTemplateCreate,
	EmailTemplateUpdate,
} from "@schemas/emailTemplates";

export type { EmailTemplate, EmailTemplateCreate, EmailTemplateUpdate };

type ExtraState = {
	valid: boolean;
	loading: boolean;
	groupName: string | null;
	lastLoad: string | null;
};

const dataAdapter = createEntityAdapter<EmailTemplate>();
const initialState = dataAdapter.getInitialState<ExtraState>({
	valid: false,
	loading: false,
	groupName: null,
	lastLoad: null,
});
const dataSet = "emailTemplates";
const slice = createSlice({
	name: dataSet,
	initialState,
	reducers: {
		getPending(state, action: PayloadAction<{ groupName: string }>) {
			const { groupName } = action.payload;
			state.loading = true;
			state.lastLoad = new Date().toISOString();
			if (state.groupName !== groupName) {
				state.groupName = groupName;
				dataAdapter.removeAll(state);
			}
		},
		getSuccess(state, action: PayloadAction<EmailTemplate[]>) {
			state.loading = false;
			state.valid = true;
			dataAdapter.setAll(state, action.payload);
		},
		getFailure(state) {
			state.loading = false;
		},
		setMany: dataAdapter.setMany,
		addMany: dataAdapter.addMany,
		removeMany: dataAdapter.removeMany,
	},
});

export default slice;

/** Slice actions */
const { getPending, getSuccess, getFailure, setMany, addMany, removeMany } =
	slice.actions;

/** Selector */
export const selectEmailTemplatesState = (state: RootState) => state[dataSet];
const selectEmailTemplatesAge = (state: RootState) => {
	let lastLoad = selectEmailTemplatesState(state).lastLoad;
	if (!lastLoad) return NaN;
	return new Date().valueOf() - new Date(lastLoad).valueOf();
};

/** Thunk actions */
const AGE_STALE = 60 * 60 * 1000; // 1 hour

let loading = false;
let loadingPromise: Promise<void> = Promise.resolve();
export const loadEmailTemplates =
	(groupName: string, force = false): AppThunk<void> =>
	async (dispatch, getState) => {
		const state = getState();
		const currentGroupName = selectEmailTemplatesState(state).groupName;
		const age = selectEmailTemplatesAge(state);
		if (currentGroupName === groupName) {
			if (loading || (!force && age && age < AGE_STALE))
				return loadingPromise;
		}
		dispatch(getPending({ groupName }));
		const url = `/api/${groupName}/email/templates`;
		loading = true;
		loadingPromise = fetcher
			.get(url)
			.then((response: any) => {
				const templates = emailTemplatesSchema.parse(response);
				dispatch(getSuccess(templates));
			})
			.catch((error: any) => {
				dispatch(getFailure());
				dispatch(setError("GET " + url, error));
			})
			.finally(() => {
				loading = false;
			});
		return loadingPromise;
	};

export const addEmailTemplate =
	(template: EmailTemplateCreate): AppThunk<EmailTemplate | undefined> =>
	async (dispatch, getState) => {
		const { groupName } = selectEmailTemplatesState(getState());
		const url = `/api/${groupName}/email/templates`;
		let templates: EmailTemplate[];
		try {
			const response = await fetcher.post(url, [template]);
			templates = emailTemplatesSchema.parse(response);
		} catch (error) {
			dispatch(setError("POST " + url, error));
			return;
		}
		dispatch(addMany(templates));
		return templates[0];
	};

export const updateEmailTemplate =
	(update: EmailTemplateUpdate): AppThunk =>
	async (dispatch, getState) => {
		const { groupName } = selectEmailTemplatesState(getState());
		const url = `/api/${groupName}/email/templates`;
		let templates: EmailTemplate[];
		try {
			const response = await fetcher.patch(url, [update]);
			templates = emailTemplatesSchema.parse(response);
		} catch (error) {
			dispatch(setError("PATCH " + url, error));
			return;
		}
		dispatch(setMany(templates));
	};

export const deleteEmailTemplate =
	(id: number): AppThunk =>
	async (dispatch, getState) => {
		const { groupName } = selectEmailTemplatesState(getState());
		const url = `/api/${groupName}/email/templates`;
		dispatch(removeMany([id]));
		try {
			await fetcher.delete(url, [id]);
		} catch (error) {
			dispatch(setError("DELETE " + url, error));
		}
	};
