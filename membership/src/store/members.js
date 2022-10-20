import fetcher from 'dot11-components/lib/fetcher';
import {createAppTableDataSlice, SortType, getSortedFilteredIds, selectCurrentPanelConfig, setPanelIsSplit} from 'dot11-components/store/appTableData';
import {setError} from 'dot11-components/store/error';
import {AccessLevel, AccessLevelOptions, AccessLevelLabels, displayAccessLevel} from 'dot11-components/lib/user';	// re-export access level constants

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
	SAPIN: {label: 'SA PIN', isId: true, sortType: SortType.NUMERIC},
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

export const dataSet = 'members';
const selectId = (m) => m.SAPIN;

const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	initialState: {},
	selectId,
	reducers: {}
});

/*
 * Reducer
 */
export default slice.reducer;


/*
 * Selectors
 */
export const selectMembersState = (state) => state[dataSet];
export const selectMembersEntities = (state) => selectMembersState(state).entities;

export const selectMembersCurrentPanelConfig = (state) => selectCurrentPanelConfig(state, dataSet);

/*
 * Actions
 */
export const setMembersCurrentPanelIsSplit = (value) => setPanelIsSplit(dataSet, undefined, value);

const {
	getPending,
	getSuccess,
	getFailure,
	updateOne,
	updateMany,
	addMany,
	upsertMany,
	removeMany
} = slice.actions;

export const loadMembers = () =>
	async (dispatch, getState) => {
		dispatch(getPending());
		let response;
		try {
			response = await fetcher.get('/api/members');
			if (!Array.isArray(response))
				throw new TypeError("Unexpected response to GET: /api/members");
		}
		catch(error) {
			await Promise.all([
				dispatch(getFailure()),
				dispatch(setError('Unable to get members list', error))
			]);
			return;
		}
		await dispatch(getSuccess(response));
	}

export const updateMembers = (updates) =>
	async (dispatch) => {
		const url = `/api/members`;
		let response;
		try {
			response = await fetcher.patch(url, updates);
			if (!Array.isArray(response))
				throw new TypeError('Unexpected response to PATCH: ' + url);
		}
		catch(error) {
			await dispatch(setError('Unable to update members', error));
			return;
		}
		const asUpdated = response.map(m => ({id: m.SAPIN, changes: m}));
		await dispatch(updateMany(asUpdated));
	}

export const updateMemberStatusChange = (sapin, statusChangeEntry) =>
	async (dispatch, getState) => {
		const url = `/api/members/${sapin}/StatusChangeHistory`;
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
		const url = `/api/members/${sapin}/StatusChangeHistory`;
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
		const url = `/api/members/${sapin}/ContactEmails`;
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
		const url = `/api/members/${sapin}/ContactEmails`;
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
		const url = `/api/members/${sapin}/ContactEmails`;
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

export const addMembers = (members) =>
	async (dispatch) => {
		let response;
		try {
			response = await fetcher.post('/api/members', members);
			if (!Array.isArray(response))
				throw new TypeError("Unexpected response to POST: /api/members");
		}
		catch(error) {
			await dispatch(setError('Unable to add members', error));
			return;
		}
		await dispatch(addMany(response));
	}

export const upsertMembers = (members) =>
	async (dispatch) => {
		let response;
		try {
			response = await fetcher.put('/api/members', {members})
			if (!Array.isArray(response))
				throw new TypeError("Unexpected response to POST: /api/members")
		}
		catch(error) {
			await dispatch(setError(`Unable to update/insert members`, error));
			return;
		}
		await dispatch(upsertMany(response));
	}

export const deleteMembers = (ids) =>
	async (dispatch, getState) => {
		dispatch(removeMany(ids));
		try {
			await fetcher.delete('/api/members', ids);
		}
		catch(error) {
			await dispatch(setError(`Unable to delete members ${ids}`, error));
		}
	}

export const UploadFormat = {
	Members: 'members',
	SAPINs: 'sapins',
	Emails: 'emails',
	History: 'history'
};

export const uploadMembers = (format, file) =>
	async (dispatch) => {
		dispatch(getPending());
		const url = `/api/members/upload/${format}`;
		let response;
		try {
			response = await fetcher.postMultipart(url, {File: file});
			if (!Array.isArray(response))
				throw new TypeError('Unexpected response to POST: ' + url);
		}
		catch(error) {
			await Promise.all([
				dispatch(getFailure()),
				dispatch(setError('Unable to upload users', error))
			]);
			return;
		}
		await dispatch(getSuccess(response));
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
		dispatch(getPending());
		const url = `/api/members/MyProjectRoster`;
		let response;
		try {
			response = await fetcher.postMultipart(url, {File: file});
			if (!Array.isArray(response))
				throw new TypeError('Unexpected response to POST: ' + url);
		}
		catch(error) {
			await Promise.all([
				dispatch(getFailure()),
				dispatch(setError('Unable to upload roster', error))
			]);
			return;
		}
		await dispatch(getSuccess(response));
	}
