import {createSlice, createEntityAdapter} from '@reduxjs/toolkit'

import fetcher from 'dot11-components/lib/fetcher'
import sortsSlice, {initSorts, SortDirection, SortType} from 'dot11-components/store/sort'
import filtersSlice, {initFilters, FilterType} from 'dot11-components/store/filters'
import selectedSlice, {setSelected} from 'dot11-components/store/selected'
import uiSlice, {setProperty} from 'dot11-components/store/ui'
import {setError} from 'dot11-components/store/error'
import {getSortedFilteredIds} from 'dot11-components/store/dataSelectors'
import {AccessLevel, AccessLevelOptions, AccessLevelLabels, displayAccessLevel} from 'dot11-components/lib/user'	// re-export access level constants

export {AccessLevel, AccessLevelOptions, AccessLevelLabels};

const Status = {
	'Non-Voter': 'Non-Voter',
	'Aspirant': 'Aspirant',
	'Potential Voter': 'Potential Voter',
	'Voter': 'Voter',
	'ExOfficio': 'ExOfficio',
	'Obsolete': 'Obsolete'
};

export const StatusOptions = Object.entries(Status).map(([k, v]) => ({value: k, label: v}));

export const fields = {
	SAPIN: {label: 'SA PIN', sortType: SortType.NUMERIC},
	Name: {label: 'Name'},
	Email: {label: 'Email'},
	Employer: {label: 'Employer'},
	Affiliation: {label: 'Affiliation'}, 
	Status: {label: 'Status'},
	NewStatus: {label: 'Expected status'},
	Access: {label: 'Access level', dataRenderer: displayAccessLevel, sortType: SortType.NUMERIC, options: AccessLevelOptions},
	AttendanceCount: {label: 'Session participation', sortType: SortType.NUMERIC},
	BallotSeriesCount: {label: 'Ballot participation', sortType: SortType.NUMERIC},
};

/*
 * Remove entries that no longer exist from a list. If there
 * are no changes, return the original list.
 */
function filterIdList(idList, allIds) {
	const newList = idList.filter(id => allIds.includes(id));
	return newList.length === idList.length? idList: newList;
}

const membersAdapter = createEntityAdapter({
	selectId: (m) => m.SAPIN
});

const dataSet = 'members';

const slice = createSlice({
	name: dataSet,
	initialState: membersAdapter.getInitialState({
		valid: false,
		loading: false,
		[sortsSlice.name]: sortsSlice.reducer(undefined, initSorts(fields)),
		[filtersSlice.name]: filtersSlice.reducer(undefined, initFilters(fields)),
		[selectedSlice.name]: selectedSlice.reducer(undefined, {}),
		[uiSlice.name]: uiSlice.reducer(undefined, {})	
	}),
	reducers: {
		getPending(state, action) {
			state.loading = true;
		},
		getSuccess(state, action) {
			const members = action.payload;
			state.loading = false;
			state.valid = true;
			membersAdapter.setAll(state, members);
			state[selectedSlice.name] = filterIdList(state[selectedSlice.name], state.ids);
		},
		getFailure(state, action) {
			state.loading = false;
		},
		updateOne(state, action) {
			const {id, changes} = action.payload;
			membersAdapter.updateOne(state, {id, changes});
			state[selectedSlice.name] = filterIdList(state[selectedSlice.name], state.ids);
		},
		addOne(state, action) {
			const member = action.payload;
			membersAdapter.addOne(state, member);
		},
		updateMany(state, action) {
			const members = action.payload;
			membersAdapter.updateMany(state, members);
			state[selectedSlice.name] = filterIdList(state[selectedSlice.name], state.ids);
		},
		upsertMany(state, action) {
			const members = action.payload;
			membersAdapter.upsertMany(state, members);
			state[selectedSlice.name] = filterIdList(state[selectedSlice.name], state.ids);
		},
		deleteMany(state, action) {
			const sapins = action.payload;
			membersAdapter.removeMany(state, sapins);
			state[selectedSlice.name] = filterIdList(state[selectedSlice.name], state.ids);
		},
		uploadPending(state, action) {
			state.loading = true;
		},
		uploadSuccess(state, action) {
			const members = action.payload;
			state.valid = true;
			state.loading = false;
			membersAdapter.setAll(state, members);
			state[selectedSlice.name] = filterIdList(state[selectedSlice.name], state.ids);
		},
		uploadFailure(state, action) {
			state.loading = false;
		}
	},
	extraReducers: builder => {
		builder
		.addMatcher(
			(action) => action.type.startsWith(dataSet + '/'),
			(state, action) => {
				const sliceAction = {...action, type: action.type.replace(dataSet + '/', '')}
				state[sortsSlice.name] = sortsSlice.reducer(state[sortsSlice.name], sliceAction);
				state[filtersSlice.name] = filtersSlice.reducer(state[filtersSlice.name], sliceAction);
				state[selectedSlice.name] = selectedSlice.reducer(state[selectedSlice.name], sliceAction);
				state[uiSlice.name] = uiSlice.reducer(state[uiSlice.name], sliceAction);
			}
		)
	}
});

/*
 * Export reducer as default
 */
export default slice.reducer;

const {getPending, getSuccess, getFailure} = slice.actions;

export const loadMembers = () =>
	async (dispatch, getState) => {
		if (getState()[dataSet].loading)
			return;
		dispatch(getPending());
		let response;
		try {
			response = await fetcher.get('/api/members');
			if (!Array.isArray(response))
				throw new TypeError("Unexpected response to GET: /api/members");
		}
		catch(error) {
			console.log(error)
			await Promise.all([
				dispatch(getFailure()),
				dispatch(setError('Unable to get members list', error))
			]);
			return;
		}
		await dispatch(getSuccess(response));
	}

const {updateOne} = slice.actions;

export const updateMember = (sapin, changes) =>
	async (dispatch) => {
		dispatch(updateOne({id: sapin, changes}));
		const url = `/api/member/${sapin}`;
		let response;
		try {
			response = await fetcher.patch(url, changes);
			if (typeof response !== 'object')
				throw new TypeError('Unexpected response to PATCH: ' + url);
		}
		catch(error) {
			await dispatch(setError('Unable to update member', error));
			return;
		}
		await dispatch(updateOne({id: sapin, changes: response}));
	}

const {updateMany} = slice.actions;

export const updateMembers = (members) =>
	async (dispatch) => {
		//dispatch(updateMany(members));
		const url = `/api/members`;
		let response;
		try {
			response = await fetcher.patch(url, members);
			if (!Array.isArray(response))
				throw new TypeError('Unexpected response to PATCH: ' + url);
		}
		catch(error) {
			await dispatch(setError('Unable to update members', error));
			return;
		}
		const updates = response.map(m => ({id: m.SAPIN, changes: m}));
		await dispatch(updateMany(updates));
	}

export const updateMemberStatusChange = (sapin, statusChangeEntry) =>
	async (dispatch, getState) => {
		const url = `/api/member/${sapin}/StatusChangeHistory`;
		let response;
		try {
			response = await fetcher.patch(url, statusChangeEntry);
			if (typeof response !== 'object')
				throw new TypeError('Unexpected response to PATCH: ' + url);
		}
		catch(error) {
			await dispatch(setError('Unable to update member', error));
			return;
		}
		await dispatch(updateOne({id: sapin, changes: response}));
	}

export const deleteMemberStatusChange = (sapin, statusChangeId) =>
	async (dispatch, getState) => {
		const url = `/api/member/${sapin}/StatusChangeHistory`;
		let response;
		try {
			response = await fetcher.delete(url, {id: statusChangeId});
			if (typeof response !== 'object')
				throw new TypeError('Unexpected response to DELETE: ' + url);
		}
		catch(error) {
			await dispatch(setError('Unable to update member', error));
			return;
		}
		await dispatch(updateOne({id: sapin, changes: response}));
	}

export const addMemberContactEmail = (sapin, entry) =>
	async (dispatch, getState) => {
		const url = `/api/member/${sapin}/ContactEmails`;
		let response;
		try {
			response = await fetcher.post(url, entry);
			if (typeof response !== 'object')
				throw new TypeError('Unexpected response to POST: ' + url);
		}
		catch(error) {
			await dispatch(setError('Unable to update member', error));
			return;
		}
		await dispatch(updateOne({id: sapin, changes: response}));
	}

export const updateMemberContactEmail = (sapin, entry) =>
	async (dispatch, getState) => {
		const url = `/api/member/${sapin}/ContactEmails`;
		let response;
		try {
			response = await fetcher.patch(url, entry);
			if (typeof response !== 'object')
				throw new TypeError('Unexpected response to PATCH: ' + url);
		}
		catch(error) {
			await dispatch(setError('Unable to update member', error));
			return;
		}
		await dispatch(updateOne({id: sapin, changes: response}));
	}

export const deleteMemberContactEmail = (sapin, id) =>
	async (dispatch, getState) => {
		const url = `/api/member/${sapin}/ContactEmails`;
		let response;
		try {
			response = await fetcher.delete(url, {id});
			if (typeof response !== 'object')
				throw new TypeError('Unexpected response to DELETE: ' + url);
		}
		catch(error) {
			await dispatch(setError('Unable to update member', error));
			return;
		}
		await dispatch(updateOne({id: sapin, changes: response}));
	}

const {addOne} = slice.actions;

export const addMember = (member) =>
	async (dispatch) => {
		let response;
		try {
			response = await fetcher.post('/api/member', {member});
			if (typeof response !== 'object')
				throw new TypeError("Unexpected response to POST: /api/member");
		}
		catch(error) {
			await dispatch(setError(`Unable to add member SAPIN=${member.SAPIN}`, error));
			return;
		}
		await dispatch(addOne(response));
	}

const {upsertMany} = slice.actions;

export const upsertMembers = (members) =>
	async (dispatch) => {
		let response;
		try {
			response = await fetcher.post('/api/members', {members})
			if (!Array.isArray(response))
				throw new TypeError("Unexpected response to POST: /api/members")
		}
		catch(error) {
			await dispatch(setError(`Unable to update/insert members`, error));
			return;
		}
		await dispatch(upsertMany(response));
	}

const {deleteMany} = slice.actions;

export const deleteMembers = (ids) =>
	async (dispatch, getState) => {
		dispatch(deleteMany(ids));
		try {
			await fetcher.delete('/api/members', ids);
		}
		catch(error) {
			await dispatch(setError(`Unable to delete members ${ids}`, error));
		}
	}

const {uploadPending, uploadSuccess, uploadFailure} = slice.actions;

export const UploadFormat = {
	Members: 'members',
	SAPINs: 'sapins',
	Emails: 'emails',
	History: 'history'
};

export const uploadMembers = (format, file) =>
	async (dispatch) => {
		dispatch(uploadPending());
		const url = `/api/members/upload/${format}`;
		let response;
		try {
			response = await fetcher.postMultipart(url, {File: file});
			if (!Array.isArray(response))
				throw new TypeError('Unexpected response to POST: ' + url);
		}
		catch(error) {
			await Promise.all([
				dispatch(uploadFailure()),
				dispatch(setError('Unable to upload users', error))
			]);
			return;
		}
		await dispatch(uploadSuccess(response));
	}

export const deleteSelectedMembers = () => 
	async (dispatch, getState) => {
		const state = getState();
		const selected = state[dataSet].selected;
		const shown = getSortedFilteredIds(state, dataSet);
		const ids = selected.filter(id => shown.includes(id));
		await dispatch(deleteMembers(ids));
	}

export const exportMyProjectRoster = () =>
	async (dispatch) => {
		try {
			await fetcher.getFile('/api/members/MyProjectRoster');
		}
		catch(error) {
			await dispatch(setError('Unable to get file', error))
		}
	}

export const importMyProjectRoster = (file) =>
	async (dispatch) => {
		dispatch(uploadPending());
		const url = `/api/members/MyProjectRoster`;
		let response;
		try {
			response = await fetcher.postMultipart(url, {File: file});
			if (!Array.isArray(response))
				throw new TypeError('Unexpected response to POST: ' + url);
		}
		catch(error) {
			await Promise.all([
				dispatch(uploadFailure()),
				dispatch(setError('Unable to upload roster', error))
			]);
			return;
		}
		await dispatch(uploadSuccess(response));
	}

export const setMemberUiProperty = (property, value) => setProperty(dataSet, property, value);
