import { createSelector } from '@reduxjs/toolkit';
import type { Dictionary, Update, EntityId } from '@reduxjs/toolkit';

import {
	fetcher,
	setError,
	createAppTableDataSlice,
	getAppTableDataSelectors,
	SortType,
	AccessLevelOptions,
	displayAccessLevel,
	AppTableDataState,
	isObject
} from 'dot11-components';

import type { RootState, AppThunk } from '.';
import { selectAttendancesWithMembershipAndSummary } from './sessionParticipation';
import { selectBallotParticipationWithMembershipAndSummary } from './ballotParticipation';
import { selectWorkingGroupName } from './groups';

export { AccessLevelOptions };

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

export type MemberContactInfo = {
	StreetLine1: string;
	StreetLine2: string;
	City: string;
	State: string;
	Zip: string;
	Country: string;
	Phone: string;
	Fax: string;
}

export type MemberCommon = {
	SAPIN: number;
	Name: string;
	FirstName: string;
	LastName: string;
	MI: string;
	Email: string;
	Employer: string;
	Affiliation: string;
	Status: string;
	Access: number;
}

export type MemberExtra = {
	Permissions: string[];
	ContactEmails: MemberContactEmail[];
	ContactInfo: MemberContactInfo;
	StatusChangeOverride: 0 | 1;
	StatusChangeHistory: StatusChangeType[];
	BallotSeriesCount: number;
	BallotSeriesTotal: number;
	AttendanceCount: number;
	DateAdded: string;
	ObsoleteSAPINs: number[];
	StatusChangeDate: string;
	ReplacedBySAPIN: number | null;
};

export type MemberAdd = MemberCommon & Partial<MemberExtra>;
export type Member = MemberCommon & MemberExtra;

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

export const selectActiveMembers = createSelector(
	selectMemberIds,
	selectMemberEntities,
	(ids, entities) => ids
		.map(id => entities[id]!)
		.filter(m => ["Voter", "Potential Voter", "Aspirant", "ExOfficio"].includes(m.Status))
		.sort((m1, m2) => m1.Name.localeCompare(m2.Name))
);

export const selectVotingMembers = createSelector(
	selectMemberIds,
	selectMemberEntities,
	(ids, entities) => ids
		.map(id => entities[id]!)
		.filter(m => m.Status === "Voter")
		.sort((m1, m2) => m1.Name.localeCompare(m2.Name))
);

export const selectAllMembers = createSelector(
	selectMemberIds,
	selectMemberEntities,
	(ids, entities) => ids.map(id => entities[id]!)
);

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

const dataSet = 'members';
const selectId = (m: Member) => m.SAPIN;
const sortComparer = (m1: Member, m2: Member) => m1.SAPIN - m2.SAPIN;
const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	initialState: {},
	selectId,
	sortComparer,
	reducers: {}
});

export default slice;


/*
 * Actions
 */
export const membersActions = slice.actions;

const {
	getPending,
	getSuccess,
	getFailure,
	setOne,
	setMany,
	addMany,
	removeMany,
	setUiProperties
} = slice.actions;

export {setUiProperties};

function validMember(member: any): member is Member {
	return isObject(member) &&
		typeof member.SAPIN === 'number';
}

function validResponse(members: unknown): members is Member[] {
	return Array.isArray(members) && members.every(validMember);
}

export const loadMembers = (): AppThunk =>
	async (dispatch, getState) => {
		const groupName = selectWorkingGroupName(getState());
		if (!groupName)
			return;
		const url = `/api/${groupName}/members`;
		dispatch(getPending());
		let response: any;
		try {
			response = await fetcher.get(url);
			if (!validResponse(response))
				throw new TypeError('Unexpected response to GET');
		}
		catch(error) {
			dispatch(getFailure());
			dispatch(setError('Unable to get members list', error));
			return;
		}
		dispatch(getSuccess(response));
	}

export const updateMembers = (updates: Update<Member>[]): AppThunk =>
	async (dispatch, getState) => {
		const groupName = selectWorkingGroupName(getState());
		const url = `/api/${groupName}/members`;
		let response: any;
		try {
			response = await fetcher.patch(url, updates);
			if (!validResponse(response))
				throw new TypeError('Unexpected response to PATCH');
		}
		catch(error) {
			dispatch(setError('Unable to update members', error));
			return;
		}
		dispatch(setMany(response));
	}

type StatusChangeEntryUpdate = {
	id: number;
	changes: Partial<StatusChangeType>;
}

export const addMemberStatusChangeEntries = (sapin: number, entries: StatusChangeType[]): AppThunk =>
	async (dispatch, getState) => {
		const groupName = selectWorkingGroupName(getState());
		const url = `/api/${groupName}/members/${sapin}/StatusChangeHistory`;
		let response: any;
		try {
			response = await fetcher.put(url, entries);
			if (!validMember(response))
				throw new TypeError('Unexpected response to PUT ' + url);
		}
		catch(error) {
			dispatch(setError('Unable to update member', error));
			return;
		}
		dispatch(setOne(response));
	}

export const updateMemberStatusChangeEntries = (sapin: number, updates: StatusChangeEntryUpdate[]): AppThunk =>
	async (dispatch, getState) => {
		const groupName = selectWorkingGroupName(getState());
		const url = `/api/${groupName}/members/${sapin}/StatusChangeHistory`;
		let response: any;
		try {
			response = await fetcher.patch(url, updates);
			if (!validMember(response))
				throw new TypeError('Unexpected response to PATCH ' + url);
		}
		catch(error) {
			dispatch(setError('Unable to update member', error));
			return;
		}
		dispatch(setOne(response));
	}

export const deleteMemberStatusChangeEntries = (sapin: number, ids: number[]): AppThunk =>
	async (dispatch, getState) => {
		const groupName = selectWorkingGroupName(getState());
		const url = `/api/${groupName}/members/${sapin}/StatusChangeHistory`;
		let response: any;
		try {
			response = await fetcher.delete(url, ids);
			if (!validMember(response))
				throw new TypeError('Unexpected response to DELETE ' + url);
		}
		catch(error) {
			dispatch(setError('Unable to delete member', error));
			return;
		}
		dispatch(setOne(response));
	}

export const addMembers = (members: MemberAdd[]): AppThunk =>
	async (dispatch, getState) => {
		const groupName = selectWorkingGroupName(getState());
		const url = `/api/${groupName}/members`;
		let response: any;
		try {
			response = await fetcher.post(url, members);
			if (!validResponse(response))
				throw new TypeError('Unexpected response to POST ' + url);
		}
		catch(error) {
			dispatch(setError('Unable to add members', error));
			return;
		}
		dispatch(addMany(response));
	}

export const deleteMembers = (ids: number[]): AppThunk =>
	async (dispatch, getState) => {
		const groupName = selectWorkingGroupName(getState());
		const url = `/api/${groupName}/members`;
		dispatch(removeMany(ids));
		try {
			await fetcher.delete(url, ids);
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
	async (dispatch, getState) => {
		const groupName = selectWorkingGroupName(getState());
		const url = `/api/${groupName}/members/upload/${format}`;
		dispatch(getPending());
		let response: any;
		try {
			response = await fetcher.postMultipart(url, {File: file});
			if (!validResponse(response))
				throw new TypeError('Unexpected response to POST ' + url);
		}
		catch(error) {
			dispatch(getFailure());
			dispatch(setError('Unable to upload users', error));
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
	async (dispatch, getState) => {
		const groupName = selectWorkingGroupName(getState());
		const url = `/api/${groupName}/members/MyProjectRoster`;
		try {
			await fetcher.getFile(url);
		}
		catch(error) {
			dispatch(setError('Unable to get file', error))
		}
	}

export const importMyProjectRoster = (file: any): AppThunk =>
	async (dispatch, getState) => {
		const groupName = selectWorkingGroupName(getState());
		const url = `/api/${groupName}/members/MyProjectRoster`;
		dispatch(getPending());
		let response: any;
		try {
			response = await fetcher.postMultipart(url, {File: file});
			if (!validResponse(response))
				throw new TypeError('Unexpected response to POST ' + url);
		}
		catch(error) {
			dispatch(getFailure());
			dispatch(setError('Unable to upload roster', error));
			return;
		}
		dispatch(getSuccess(response));
	}
