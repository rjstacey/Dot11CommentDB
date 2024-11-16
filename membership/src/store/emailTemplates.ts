import {
	createSlice,
	createEntityAdapter,
	PayloadAction,
} from "@reduxjs/toolkit";
import { fetcher, setError, isObject } from "dot11-components";

import type { AppThunk, RootState } from ".";

export type EmailTemplate = {
	id: number;
	name: string;
	subject: string;
	body: string;
};

export type EmailTemplateCreate = Omit<EmailTemplate, "id">;
export type EmailTemplateUpdate = {
	id: number;
	changes: Partial<EmailTemplate>;
};

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

/*
 * Selector
 */
export const selectEmailTemplatesState = (state: RootState) => state[dataSet];
const selectEmailTemplatesAge = (state: RootState) => {
	let lastLoad = selectEmailTemplatesState(state).lastLoad;
	if (!lastLoad) return NaN;
	return new Date().valueOf() - new Date(lastLoad).valueOf();
};

/*
 * Actions
 */
const { getPending, getSuccess, getFailure, setMany, addMany, removeMany } =
	slice.actions;

function validEmailTemplate(template: any): template is EmailTemplate {
	return (
		isObject(template) &&
		typeof template.id === "number" &&
		typeof template.name === "string" &&
		typeof template.subject === "string" &&
		typeof template.body === "string"
	);
}

function validEmailTemplates(templates: any): templates is EmailTemplate[] {
	return Array.isArray(templates) && templates.every(validEmailTemplate);
}

const AGE_STALE = 60 * 60 * 1000; // 1 hour

let loadingPromise: Promise<EmailTemplate[]>;
export const loadEmailTemplates =
	(groupName: string, force = false): AppThunk<EmailTemplate[]> =>
	async (dispatch, getState) => {
		const { loading, groupName: currentGroupName } =
			selectEmailTemplatesState(getState());
		if (groupName === currentGroupName) {
			if (loading) return loadingPromise;
			const age = selectEmailTemplatesAge(getState());
			if (!force && age && age < AGE_STALE) return loadingPromise;
		}
		dispatch(getPending({ groupName }));
		const url = `/api/${groupName}/email/templates`;
		loadingPromise = fetcher
			.get(url)
			.then((response: any) => {
				if (!validEmailTemplates(response))
					throw new TypeError(`Unexpected response to GET ${url}`);
				dispatch(getSuccess(response));
				return response;
			})
			.catch((error: any) => {
				dispatch(getFailure());
				dispatch(setError("Unable to get email templates", error));
				return [];
			});
		return loadingPromise;
	};

export const addEmailTemplate =
	(template: EmailTemplateCreate): AppThunk<EmailTemplate | undefined> =>
	async (dispatch, getState) => {
		const { groupName } = selectEmailTemplatesState(getState());
		const url = `/api/${groupName}/email/templates`;
		let response: any;
		try {
			response = await fetcher.post(url, [template]);
			if (!validEmailTemplates(response))
				throw new TypeError("Unexpected response to POST " + url);
		} catch (error) {
			dispatch(setError("Unable to add email template", error));
			return;
		}
		dispatch(addMany(response));
		return response[0];
	};

export const updateEmailTemplate =
	(update: EmailTemplateUpdate): AppThunk =>
	async (dispatch, getState) => {
		const { groupName } = selectEmailTemplatesState(getState());
		const url = `/api/${groupName}/email/templates`;
		let response: any;
		try {
			response = await fetcher.patch(url, [update]);
			if (!validEmailTemplates(response))
				throw new TypeError("Unexpected response to PATCH");
		} catch (error) {
			dispatch(setError("Unable to update email template", error));
			return;
		}
		dispatch(setMany(response));
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
			dispatch(setError(`Unable to delete email template`, error));
		}
	};
