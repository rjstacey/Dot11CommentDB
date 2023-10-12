import { createSlice, createEntityAdapter, PayloadAction } from '@reduxjs/toolkit';
import { fetcher, setError, isObject } from 'dot11-components';

import type { AppThunk, RootState } from '.';
import { selectWorkingGroupName } from './groups';

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
}

const dataAdapter = createEntityAdapter<EmailTemplate>();
const initialState = dataAdapter.getInitialState({
	valid: false,
	loading: false,
});
const dataSet = 'emailTemplates';
const slice = createSlice({
	name: dataSet,
	initialState,
	reducers: {
		getPending(state) {
			state.loading = true;
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
        removeMany: dataAdapter.removeMany
	},
});

export default slice;

/*
 * Selector
 */
export const selectEmailTemplatesState = (state: RootState) => state[dataSet];

/*
 * Actions
 */
const {
	getPending,
	getSuccess,
	getFailure,
    setMany,
    addMany,
    removeMany
} = slice.actions;

function validEmailTemplate(template: any): template is EmailTemplate {
	return (
		isObject(template) &&
        typeof template.id === 'number' &&
        typeof template.name === 'string' &&
		typeof template.subject === 'string' &&
		typeof template.body === 'string'
	)
}

function validEmailTemplates(templates: any): templates is EmailTemplate[] {
	return Array.isArray(templates) && templates.every(validEmailTemplate);
}

export const loadEmailTemplates = (): AppThunk =>
	async (dispatch, getState) => {
		const groupName = selectWorkingGroupName(getState());
		if (!groupName)
			return;
		const url = `/api/${groupName}/email/templates`;
		dispatch(getPending());
		let templates: any;
		try {
			templates = await fetcher.get(url);
			if (!validEmailTemplates(templates))
				throw new TypeError(`Unexpected response to GET ${url}`);
		}
		catch(error) {
			dispatch(getFailure());
			dispatch(setError('Unable to get email templates', error));
			return;
		}
		dispatch(getSuccess(templates));
	}

export const addEmailTemplate = (template: EmailTemplateCreate): AppThunk<EmailTemplate | undefined> =>
	async (dispatch, getState) => {
		const groupName = selectWorkingGroupName(getState());
		const url = `/api/${groupName}/email/templates`;
		let response: any;
		try {
			response = await fetcher.post(url, [template]);
			if (!validEmailTemplates(response))
				throw new TypeError('Unexpected response to POST ' + url);
		}
		catch(error) {
			dispatch(setError('Unable to add email template', error));
			return;
		}
		dispatch(addMany(response));
        return response[0];
	}

export const updateEmailTemplate = (update: EmailTemplateUpdate): AppThunk =>
	async (dispatch, getState) => {
		const groupName = selectWorkingGroupName(getState());
		const url = `/api/${groupName}/email/templates`;
		let response: any;
		try {
			response = await fetcher.patch(url, [update]);
			if (!validEmailTemplates(response))
				throw new TypeError('Unexpected response to PATCH');
		}
		catch(error) {
			dispatch(setError('Unable to update email template', error));
			return;
		}
		dispatch(setMany(response));
	}

export const deleteEmailTemplate = (id: number): AppThunk =>
	async (dispatch, getState) => {
		const groupName = selectWorkingGroupName(getState());
		const url = `/api/${groupName}/email/templates`;
		dispatch(removeMany([id]));
		try {
			await fetcher.delete(url, [id]);
		}
		catch(error) {
			dispatch(setError(`Unable to delete email template`, error));
		}
	}

export const sendEmail = (email: any): AppThunk =>
	async (dispatch, getState) => {
		const groupName = selectWorkingGroupName(getState());
		const url = `/api/${groupName}/email/send`;
		try {
			await fetcher.post(url, email);
		}
		catch (error) {
			setError('Unable to send email: ', error);
		}
	}
