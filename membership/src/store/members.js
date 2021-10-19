import fetcher from 'dot11-components/lib/fetcher';
import {createAppTableDataSlice, SortType, getSortedFilteredIds} from 'dot11-components/store/appTableData';
import {setError} from 'dot11-components/store/error';
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
});

/*
 * Export reducer as default
 */
export default slice.reducer;

const {
	getPending,
	getSuccess,
	getFailure,
	updateOne,
	updateMany,
	addOne,
	upsertMany,
	removeMany
} = slice.actions;

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
			await Promise.all([
				dispatch(getFailure()),
				dispatch(setError('Unable to get members list', error))
			]);
			return;
		}
		await dispatch(getSuccess(response));
	}

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

export const updateMembers = (members) =>
	async (dispatch) => {
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

export const setMemberUiProperty = (property, value) => slice.actions.setProperty({property, value});
