import { createSelector } from '@reduxjs/toolkit';

import type { Dictionary, Update, EntityId } from '@reduxjs/toolkit';

import {
	fetcher,
	setError,
	createAppTableDataSlice,
	getAppTableDataSelectors,
	SortType,
	AccessLevel,
	AccessLevelOptions,
	AccessLevelLabels,
	displayAccessLevel,
	AppTableDataState
} from 'dot11-components';

import { selectAttendancesWithMembershipAndSummary } from './attendances';
import { selectBallotParticipationWithMembershipAndSummary } from './ballotParticipation';

import type {RootState, AppThunk} from '.';

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

export type StatusChangeType = {
	id: number;
	Date: string;
	OldStatus: string;
	NewStatus: string;
	Reason: string;
};

export type MemberContactEmail = {
	id: number;
	Email: string;
	Primary: 0 | 1;
	Broken: 0 | 1;
	DateAdded: string;
};

export type MemberAdd = {
	SAPIN: number;
	Name: string;
	Email: string;
	Status: string;
	Affiliation: string;
	Access: number;
};

export type Member = {
	SAPIN: number;
	Name: string;
	Email: string;
	Employer: string;
	Affiliation: string;
	Permissions: string[];
	ContactEmails: MemberContactEmail[];
	ContactInfo: { [k: string]: string };
	Status: string;
	StatusChangeOverride: 0 | 1;
	Access: number;
	StatusChangeHistory: StatusChangeType[];
	BallotSeriesCount: number;
	BallotSeriesTotal: number;
	AttendanceCount: number;
	DateAdded: string;
	ObsoleteSAPINs: number[];
	StatusChangeDate: string;
	ReplacedBySAPIN: number | null;
};

export type MemberWithParticipation = Member & {
	AttendancesSummary: string;
	BallotParticipationSummary: string;
}

export type MembersDictionary = Dictionary<Member>;

export {EntityId};

export const fields = {
	SAPIN: {label: 'SA PIN', isId: true, sortType: SortType.NUMERIC},
	Name: {label: 'Name'},
	Email: {label: 'Email'},
	Employer: {label: 'Employer'},
	Affiliation: {label: 'Affiliation'}, 
	Status: {label: 'Status'},
	Access: {label: 'Access level', dataRenderer: displayAccessLevel, sortType: SortType.NUMERIC, options: AccessLevelOptions},
	AttendancesSummary: {label: 'Session participation'},
	BallotParticipationSummary: {label: 'Ballot participation'}
};

export const dataSet = 'members';

const selectId = (m: Member) => m.SAPIN;

const sortComparer = (m1: Member, m2: Member) => m1.SAPIN - m2.SAPIN;

/*
 * Fields derived from other fields
 */
export function getField(entity: Member, key: string): any {
	if (!(key in entity))
		console.warn(dataSet + ' has no field ' + key);
	return entity[key as keyof Member];
}

/*
 * Selectors
 */
export const selectMembersState = (state: RootState): MembersState => state[dataSet];
export const selectMemberIds = (state: RootState) => selectMembersState(state).ids;
export function selectMemberEntities(state: RootState) {return selectMembersState(state).entities};

const selectMemberWithParticipationSummary = createSelector(
	selectAttendancesWithMembershipAndSummary,
	selectBallotParticipationWithMembershipAndSummary,
	selectMemberIds,
	selectMemberEntities,
	(attendancesEntities, ballotParticipationEntities, ids, entities) => {
		const newEntities: Record<EntityId, MemberWithParticipation> = {};
		ids.forEach(id => {
			const member = entities[id]!;
			const attendancesEntity = attendancesEntities[id];
			const ballotParticipationEntity = ballotParticipationEntities[id];
			newEntities[id] = {
				...member,
				AttendancesSummary: attendancesEntity? attendancesEntity.Summary: '',
				BallotParticipationSummary: ballotParticipationEntity? ballotParticipationEntity.Summary: ''
			}
		});
		return newEntities;
	}
);

export const membersSelectors = getAppTableDataSelectors(selectMembersState, {selectEntities: selectMemberWithParticipationSummary});

export const selectUiProperties = membersSelectors.selectUiProperties;

/*
 * Slice
 */
type MembersState = AppTableDataState<Member>;

const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	initialState: {},
	selectId,
	sortComparer,
	reducers: {}
});

export default slice;

export const membersActions = slice.actions;

/*
 * Actions
 */
const {
	getPending,
	getSuccess,
	getFailure,
	updateOne,
	updateMany,
	addMany,
	upsertMany,
	removeMany,
	setUiProperties
} = slice.actions;

export {setUiProperties};

const baseUrl = '/api/members';

export const loadMembers = (): AppThunk =>
	async (dispatch) => {
		dispatch(getPending());
		let response;
		try {
			response = await fetcher.get(baseUrl);
			if (!Array.isArray(response))
				throw new TypeError('Unexpected response to GET ' + baseUrl);
		}
		catch(error) {
			await Promise.all([
				dispatch(getFailure()),
				dispatch(setError('Unable to get members list', error))
			]);
			return;
		}
		dispatch(getSuccess(response));
	}

export const updateMembers = (updates: Update<Member>[]): AppThunk =>
	async (dispatch) => {
		dispatch(updateMany(updates));
		let response;
		try {
			response = await fetcher.patch(baseUrl, updates);
			if (!Array.isArray(response))
				throw new TypeError('Unexpected response to PATCH ' + baseUrl);
		}
		catch(error) {
			dispatch(setError('Unable to update members', error));
			return;
		}
		//const asUpdated = response.map(m => ({id: m.SAPIN, changes: m}));
		//dispatch(updateMany(asUpdated));
	}

export const updateMemberStatusChange = (sapin: number, statusChangeEntry: {}): AppThunk =>
	async (dispatch, getState) => {
		const url = `${baseUrl}/${sapin}/StatusChangeHistory`;
		let response;
		try {
			response = await fetcher.patch(url, statusChangeEntry);
			if (typeof response !== 'object')
				throw new TypeError('Unexpected response to PATCH ' + url);
		}
		catch(error) {
			dispatch(setError('Unable to update member', error));
			return;
		}
		dispatch(updateOne({id: sapin, changes: response}));
	}

export const deleteMemberStatusChange = (sapin: number, statusChangeId: number): AppThunk =>
	async (dispatch, getState) => {
		const url = `${baseUrl}/${sapin}/StatusChangeHistory`;
		let response;
		try {
			response = await fetcher.delete(url, {id: statusChangeId});
			if (typeof response !== 'object')
				throw new TypeError('Unexpected response to DELETE ' + url);
		}
		catch(error) {
			dispatch(setError('Unable to update member', error));
			return;
		}
		dispatch(updateOne({id: sapin, changes: response}));
	}

export const addMemberContactEmail = (sapin: number, entry: {}): AppThunk =>
	async (dispatch, getState) => {
		const url = `${baseUrl}/${sapin}/ContactEmails`;
		let response;
		try {
			response = await fetcher.post(url, entry);
			if (typeof response !== 'object')
				throw new TypeError('Unexpected response to POST ' + url);
		}
		catch(error) {
			dispatch(setError('Unable to update member', error));
			return;
		}
		dispatch(updateOne({id: sapin, changes: response}));
	}

export const updateMemberContactEmail = (sapin: number, entry: {}): AppThunk =>
	async (dispatch) => {
		const url = `${baseUrl}/${sapin}/ContactEmails`;
		let response;
		try {
			response = await fetcher.patch(url, entry);
			if (typeof response !== 'object')
				throw new TypeError('Unexpected response to PATCH ' + url);
		}
		catch(error) {
			dispatch(setError('Unable to update member', error));
			return;
		}
		dispatch(updateOne({id: sapin, changes: response}));
	}

export const deleteMemberContactEmail = (sapin: number, id: number): AppThunk =>
	async (dispatch) => {
		const url = `${baseUrl}/${sapin}/ContactEmails`;
		let response;
		try {
			response = await fetcher.delete(url, {id});
			if (typeof response !== 'object')
				throw new TypeError('Unexpected response to DELETE ' + url);
		}
		catch(error) {
			dispatch(setError('Unable to update member', error));
			return;
		}
		dispatch(updateOne({id: sapin, changes: response}));
	}

export const addMembers = (members: MemberAdd[]): AppThunk =>
	async (dispatch) => {
		let response;
		try {
			response = await fetcher.post(baseUrl, members);
			if (!Array.isArray(response))
				throw new TypeError('Unexpected response to POST: ' + baseUrl);
		}
		catch(error) {
			dispatch(setError('Unable to add members', error));
			return;
		}
		await dispatch(addMany(response));
	}

export const upsertMembers = (members: MemberAdd[]): AppThunk =>
	async (dispatch) => {
		let response;
		try {
			response = await fetcher.put(baseUrl, {members})
			if (!Array.isArray(response))
				throw new TypeError('Unexpected response to PUT ' + baseUrl);
		}
		catch(error) {
			dispatch(setError(`Unable to update/insert members`, error));
			return;
		}
		dispatch(upsertMany(response));
	}

export const deleteMembers = (ids: number[]): AppThunk =>
	async (dispatch, getState) => {
		dispatch(removeMany(ids));
		try {
			await fetcher.delete(baseUrl, ids);
		}
		catch(error) {
			dispatch(setError(`Unable to delete members ${ids}`, error));
		}
	}

export const UploadFormat = {
	Members: 'members',
	SAPINs: 'sapins',
	Emails: 'emails',
	History: 'history',
	Roster: 'roster'		// XXX Add during typescipt conversion
};

export const uploadMembers = (format: string, file: any): AppThunk =>
	async (dispatch) => {
		dispatch(getPending());
		const url = `${baseUrl}/upload/${format}`;
		let response;
		try {
			response = await fetcher.postMultipart(url, {File: file});
			if (!Array.isArray(response))
				throw new TypeError('Unexpected response to POST ' + url);
		}
		catch(error) {
			await Promise.all([
				dispatch(getFailure()),
				dispatch(setError('Unable to upload users', error))
			]);
			return;
		}
		dispatch(getSuccess(response));
	}

export const deleteSelectedMembers = (): AppThunk => 
	async (dispatch, getState) => {
		const state = getState();
		const selected = selectMembersState(state).selected;
		const shown = membersSelectors.selectSortedFilteredIds(state);
		const ids = selected.filter((id) => shown.includes(id));
		dispatch(deleteMembers(ids as number[]));
	}

export const exportMyProjectRoster = (): AppThunk =>
	async (dispatch) => {
		try {
			await fetcher.getFile(`${baseUrl}/MyProjectRoster`);
		}
		catch(error) {
			dispatch(setError('Unable to get file', error))
		}
	}

export const importMyProjectRoster = (file: any): AppThunk =>
	async (dispatch) => {
		dispatch(getPending());
		const url = `${baseUrl}/MyProjectRoster`;
		let response;
		try {
			response = await fetcher.postMultipart(url, {File: file});
			if (!Array.isArray(response))
				throw new TypeError('Unexpected response to POST ' + url);
		}
		catch(error) {
			dispatch(getFailure());
			dispatch(setError('Unable to upload roster', error));
			return;
		}
		dispatch(getSuccess(response));
	}
