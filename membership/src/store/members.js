import {DateTime} from 'luxon';

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
	AttendancesSummary: {label: 'Session participation'},
	BallotSeriesSummary: {label: 'Ballot participation'}
};

export const dataSet = 'members';

const selectId = (m) => m.SAPIN;

const sortComparer = (m1, m2) => m1.SAPIN - m2.SAPIN;

function memberAttendancesCount(member) {
	let total = 0,		// Total plenary sessions (should be 4 since we only track last 4)
		pCount = 0,		// Count of plenary sessions properly attended
		iCount = 0,		// Count of interim sessions properly attended
		lastP = 0;		// Last properly attended session was a plenary

	// Only care about attendance since becoming a 'Non-Voter'
	let attendances = member.Attendances;
	const h = member.StatusChangeHistory.find(h => h.NewStatus === 'Non-Voter');
	if (h)
		attendances = attendances.filter(a => DateTime.fromISO(a.startDate) > DateTime.fromISO(h.Date));

	attendances.forEach(a => {
		if (a.type === 'p')
			total++;
		if ((a.AttendancePercentage >= 75 && !a.DidNotAttend) || a.DidAttend) {
			if (a.type === 'p') {
				if (pCount === 0 && iCount === 0)
					lastP = 1;	// First properly attended and its a plenary
				pCount++;
			}
			else {
				iCount++;
			}
		}
	});

	// One interim can be substituted for a plenary, but don't let it exceed total
	let count = pCount + (iCount? 1: 0);
	if (count > total)
		count = total;

	return {count, total, lastP};
}

function memberBallotSeriesCount(member) {
	// Only care about ballots since becoming a Voter
	// (a member may have lost voting status and we don't want participation from that time affecting the result)
	let ballotSeriesParticipation = member.BallotSeriesParticipation;
	const h = member.StatusChangeHistory.find(h => h.NewStatus === 'Voter');
	if (h)
		ballotSeriesParticipation = ballotSeriesParticipation.filter(s => DateTime.fromISO(s.Start) > DateTime.fromISO(h.Date));

	const count = ballotSeriesParticipation.reduce((count, ballotSeries) => (ballotSeries.Vote || ballotSeries.Excused)? count + 1: count, 0);

	return {count, total: ballotSeriesParticipation.length};
}

function memberNewStatusFromAttendances(member) {
	const status = member.Status;

	if (member.StatusChangeOverride || 
		(status !== 'Voter' && status !== 'Potential Voter' && status !== 'Aspirant' && status !== 'Non-Voter'))
		return '';

	const {count, lastP} = memberAttendancesCount(member);

	/* A Voter, Potential Voter or Aspirant becomes a Non-Voter after failing to attend 1 of the last 4 plenary sessions.
	 * One interim may be substited for a plenary session. */
	if (count === 0 && status !== 'Non-Voter')
		return 'Non-Voter';

	/* A Non-Voter becomes an Aspirant after attending 1 plenary or interim session.
	 * A Voter or Potential Voter becomes an Aspirant if they have only attended 1 of the last 4 plenary sessions
	 * or intervening interim sessions. */
	if (count === 1 && status !== 'Aspirant')
		return 'Aspirant';

	/* An Aspirant becomes a Potential Voter after attending 2 of the last 4 plenary sessions. One intervening
	 * interim meeting may be substituted for a plenary meeting. */
	if (count === 2 && status === 'Aspirant')
		return 'Potential Voter';

	/* A Potential Voter becomes a Voter at the next plenary session after attending 2 of the last 4 plenary 
	 * sessions. One intervening interim meeting may be substituted for a plenary meeting. */
	if (((count === 3 && lastP) || count > 3) && status === 'Potential Voter')
		return 'Voter';

	return '';
}

function memberNewStatusFromBallotSeriesParticipation(member) {
	if (member.StatusChangeOverride || member.Status !== 'Voter')
		return '';

	const {count, total} = memberBallotSeriesCount(member);

	if (total === 3 && count < 2)
		return 'Non-Voter';

	return '';
}

/*
 * Fields derived from other fields
 */
export function getField(entity, key) {
	if (key === 'AttendancesSummary') {
		const {count, total} = memberAttendancesCount(entity);
		return `${count}/${total}`;
	}
	if (key === 'BallotSeriesSummary') {
		const {count, total} = memberBallotSeriesCount(entity);
		return `${count}/${total}`;
	}
	if (!(key in entity))
		console.warn(dataSet + ' has no field ' + key);
	return entity[key];
}

/*
 * Selectors
 */
export const selectMembersState = (state) => state[dataSet];
export const selectMemberEntities = (state) => selectMembersState(state).entities;
export const selectNewStatusFromAttendances = (state) => selectMembersState(state).newStatusFromAttendances;
export const selectNewStatusFromBallotSeriesParticipation = (state) => selectMembersState(state).newStatusFromBallotSeriesParticipation;

export const selectMembersCurrentPanelConfig = (state) => selectCurrentPanelConfig(state, dataSet);

/*
 * Slice
 */
const reMatchEntityChange = new RegExp(dataSet + '/(getSuccess|updateMany|updateOne|addMany|upsertMany|removeMany|toggleNewStatusFromAttendances|toggleNewStatusFromBallotSeriesParticipation)');

const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	selectField: getField,
	initialState: {
		newStatusFromAttendances: false,
		newStatusFromBallotSeriesParticipation: false
	},
	selectId,
	sortComparer,
	reducers: {
		toggleNewStatusFromAttendances(state, action) {
			state.newStatusFromAttendances = !state.newStatusFromAttendances;
			if (state.newStatusFromAttendances)
				state.newStatusFromBallotSeriesParticipation = false;
		},
		toggleNewStatusFromBallotSeriesParticipation(state, action) {
			state.newStatusFromBallotSeriesParticipation = !state.newStatusFromBallotSeriesParticipation;
			if (state.newStatusFromBallotSeriesParticipation)
				state.newStatusFromAttendances = false;
		}
	},
	extraReducers: (builder, dataAdapter) => {
		builder
		.addMatcher(
			(action) => action.type.search(reMatchEntityChange) >= 0,
			(state, action) => {
				for (const member of Object.values(state.entities)) {
					let newStatus = '';
					if (state.newStatusFromAttendances)
						newStatus = memberNewStatusFromAttendances(member);
					else if (state.newStatusFromBallotSeriesParticipation)
						newStatus = memberNewStatusFromBallotSeriesParticipation(member);
					member.NewStatus = newStatus;
				}
			}
		)
	}
});

export default slice;



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
	removeMany,
	toggleNewStatusFromAttendances,
	toggleNewStatusFromBallotSeriesParticipation
} = slice.actions;

export {toggleNewStatusFromAttendances, toggleNewStatusFromBallotSeriesParticipation};

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
		await dispatch(updateMany(updates));
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
		//const asUpdated = response.map(m => ({id: m.SAPIN, changes: m}));
		//await dispatch(updateMany(asUpdated));
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
