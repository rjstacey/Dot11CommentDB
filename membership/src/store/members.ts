import { createSelector, createAction } from "@reduxjs/toolkit";
import type { Dictionary, Update, EntityId, Action } from "@reduxjs/toolkit";

import {
	fetcher,
	setError,
	createAppTableDataSlice,
	getAppTableDataSelectors,
	FieldType,
	isObject,
	displayDate,
} from "dot11-components";

import type { RootState, AppThunk } from ".";
import { selectAttendancesWithMembershipAndSummary } from "./sessionParticipation";
import { selectBallotParticipationWithMembershipAndSummary } from "./ballotParticipation";
import { selectWorkingGroupByName } from "./groups";
import { AccessLevel } from "./user";

const Status = {
	"Non-Voter": "Non-Voter",
	Aspirant: "Aspirant",
	"Potential Voter": "Potential Voter",
	Voter: "Voter",
	ExOfficio: "ExOfficio",
	Obsolete: "Obsolete",
};

export const StatusOptions = Object.entries(Status).map(([k, v]) => ({
	value: k,
	label: v,
}));

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
};

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
};

export type MemberExtra = {
	Permissions: string[];
	ContactEmails: MemberContactEmail[];
	ContactInfo: MemberContactInfo;
	StatusChangeOverride: 0 | 1;
	StatusChangeHistory: StatusChangeType[];
	StatusChangeDate: string;
	BallotSeriesCount: number;
	BallotSeriesTotal: number;
	AttendanceCount: number;
	DateAdded: string;
	ObsoleteSAPINs: number[];
	ReplacedBySAPIN: number | null;
};

export const AccessLevelOptions = [
	{ value: 0, label: "public" },
	{ value: 1, label: "member" },
	{ value: 2, label: "tg_admin" },
	{ value: 3, label: "wg_admin" },
];

export type MemberUpdateExtra = {
	StatusChangeReason: string;
};

export type MemberAdd = MemberCommon & Partial<MemberExtra>;
export type MemberUpdate = Update<Member & MemberUpdateExtra>;
export type Member = MemberCommon & MemberExtra;

export type MemberWithParticipation = Member & {
	AttendancesSummary: string;
	BallotParticipationSummary: string;
};

export type MembersDictionary = Dictionary<Member>;

export const fields = {
	SAPIN: { label: "SA PIN", type: FieldType.NUMERIC },
	Name: { label: "Name" },
	Email: { label: "Email" },
	Employer: { label: "Employer" },
	Affiliation: { label: "Affiliation" },
	Status: { label: "Status" },
	StatusChangeDate: {
		label: "Status change date",
		dataRenderer: displayDate,
		type: FieldType.DATE,
	},
	Access: {
		label: "Access level",
		type: FieldType.NUMERIC,
		options: AccessLevelOptions,
	},
	AttendancesSummary: { label: "Session participation" },
	BallotParticipationSummary: { label: "Ballot participation" },
};

/* Fields derived from other fields */
export function getField(entity: Member, key: string): any {
	if (!(key in entity)) console.warn(dataSet + " has no field " + key);
	return entity[key as keyof Member];
}

/* Slice */
const dataSet = "members";
const selectId = (m: Member) => m.SAPIN;
const sortComparer = (m1: Member, m2: Member) => m1.SAPIN - m2.SAPIN;
const initialState: { groupName: string | null } = { groupName: null };
const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	initialState,
	selectId,
	sortComparer,
	reducers: {},
	extraReducers: (builder, dataAdapter) => {
		builder
			.addMatcher(
				(action: Action) => action.type === getPending.toString(),
				(state, action: ReturnType<typeof getPending>) => {
					const { groupName } = action.payload;
					if (groupName !== state.groupName) {
						state.groupName = groupName;
						state.valid = false;
						dataAdapter.removeAll(state);
					}
				}
			)
			.addMatcher(
				(action: Action) => action.type === clearMembers.toString(),
				(state) => {
					state.groupName = null;
					state.valid = false;
					dataAdapter.removeAll(state);
				}
			);
	},
});

export default slice;

/* Slice actions */
export const membersActions = slice.actions;

const {
	getSuccess,
	getFailure,
	setOne,
	setMany,
	addMany,
	removeMany,
	setUiProperties,
	setSelected,
} = slice.actions;

// Overload getPending() with one that sets groupName
const getPending = createAction<{ groupName: string }>(dataSet + "/getPending");
export const clearMembers = createAction(dataSet + "/clear");

export { setSelected, setUiProperties };

/* Selectors */
export const selectMembersState = (state: RootState) => state[dataSet];
export const selectMemberIds = (state: RootState) =>
	selectMembersState(state).ids;
export function selectMemberEntities(state: RootState) {
	return selectMembersState(state).entities;
}
export const selectActiveMembers = createSelector(
	selectMemberIds,
	selectMemberEntities,
	(ids, entities) =>
		ids
			.map((id) => entities[id]!)
			.filter((m) =>
				["Voter", "Potential Voter", "Aspirant", "ExOfficio"].includes(
					m.Status
				)
			)
			.sort((m1, m2) => m1.Name.localeCompare(m2.Name))
);

export const selectVotingMembers = createSelector(
	selectMemberIds,
	selectMemberEntities,
	(ids, entities) =>
		ids
			.map((id) => entities[id]!)
			.filter((m) => m.Status === "Voter")
			.sort((m1, m2) => m1.Name.localeCompare(m2.Name))
);

export const selectAllMembers = createSelector(
	selectMemberIds,
	selectMemberEntities,
	(ids, entities) => ids.map((id) => entities[id]!)
);

export const selectMemberWithParticipationSummary = createSelector(
	selectAttendancesWithMembershipAndSummary,
	selectBallotParticipationWithMembershipAndSummary,
	selectMemberIds,
	selectMemberEntities,
	(attendancesEntities, ballotParticipationEntities, ids, entities) => {
		const newEntities: Record<EntityId, MemberWithParticipation> = {};
		ids.forEach((id) => {
			const member = entities[id]!;
			const attendancesEntity = attendancesEntities[id];
			const ballotParticipationEntity = ballotParticipationEntities[id];
			newEntities[id] = {
				...member,
				AttendancesSummary: attendancesEntity
					? attendancesEntity.Summary
					: "",
				BallotParticipationSummary: ballotParticipationEntity
					? ballotParticipationEntity.Summary
					: "",
			};
		});
		return newEntities;
	}
);

export const selectActiveMembersWithParticipationSummary = createSelector(
	selectActiveMembers,
	selectMemberWithParticipationSummary,
	(members, entities) => members.map((m) => entities[m.SAPIN]!)
);


export function selectMembersStatusChangeSinceDate(
	state: RootState,
	dateStr: string
) {
	const { ids, entities } = selectMembersState(state);
	const date = new Date(dateStr);
	return ids.filter((id) => new Date(entities[id]!.StatusChangeDate) > date);
}

export const membersSelectors = getAppTableDataSelectors(selectMembersState, {
	selectEntities: selectMemberWithParticipationSummary,
});

export const selectUiProperties = membersSelectors.selectUiProperties;

export const selectUserMembersAccess = (state: RootState) => {
	const { groupName } = selectMembersState(state);
	const group = groupName
		? selectWorkingGroupByName(state, groupName)
		: undefined;
	return group?.permissions.members || AccessLevel.none;
};

/* Thunk actions */
function validMember(member: any): member is Member {
	return isObject(member) && typeof member.SAPIN === "number";
}

function validResponse(members: unknown): members is Member[] {
	return Array.isArray(members) && members.every(validMember);
}

let loadingPromise: Promise<Member[]>;
export const loadMembers =
	(groupName: string): AppThunk<Member[]> =>
	(dispatch, getState) => {
		const { loading, groupName: currentGroupName } = selectMembersState(
			getState()
		);
		if (loading && currentGroupName === groupName) {
			return loadingPromise;
		}
		dispatch(getPending({ groupName }));
		loadingPromise = fetcher
			.get(`/api/${groupName}/members`)
			.then((response: any) => {
				if (!validResponse(response))
					throw new TypeError("Unexpected response to GET");
				dispatch(getSuccess(response));
				return response;
			})
			.catch((error: any) => {
				dispatch(getFailure());
				dispatch(setError("Unable to get members list", error));
				return [];
			});
		return loadingPromise;
	};

export const updateMembers =
	(updates: MemberUpdate[]): AppThunk =>
	async (dispatch, getState) => {
		const { groupName } = selectMembersState(getState());
		const url = `/api/${groupName}/members`;
		let response: any;
		try {
			response = await fetcher.patch(url, updates);
			if (!validResponse(response))
				throw new TypeError("Unexpected response to PATCH");
		} catch (error) {
			dispatch(setError("Unable to update members", error));
			return;
		}
		dispatch(setMany(response));
	};

type StatusChangeEntryUpdate = {
	id: number;
	changes: Partial<StatusChangeType>;
};

export const addMemberStatusChangeEntries =
	(sapin: number, entries: StatusChangeType[]): AppThunk =>
	async (dispatch, getState) => {
		const { groupName } = selectMembersState(getState());
		const url = `/api/${groupName}/members/${sapin}/StatusChangeHistory`;
		let response: any;
		try {
			response = await fetcher.put(url, entries);
			if (!validMember(response))
				throw new TypeError("Unexpected response to PUT " + url);
		} catch (error) {
			dispatch(setError("Unable to update member", error));
			return;
		}
		dispatch(setOne(response));
	};

export const updateMemberStatusChangeEntries =
	(sapin: number, updates: StatusChangeEntryUpdate[]): AppThunk =>
	async (dispatch, getState) => {
		const { groupName } = selectMembersState(getState());
		const url = `/api/${groupName}/members/${sapin}/StatusChangeHistory`;
		let response: any;
		try {
			response = await fetcher.patch(url, updates);
			if (!validMember(response))
				throw new TypeError("Unexpected response to PATCH " + url);
		} catch (error) {
			dispatch(setError("Unable to update member", error));
			return;
		}
		dispatch(setOne(response));
	};

export const deleteMemberStatusChangeEntries =
	(sapin: number, ids: number[]): AppThunk =>
	async (dispatch, getState) => {
		const { groupName } = selectMembersState(getState());
		const url = `/api/${groupName}/members/${sapin}/StatusChangeHistory`;
		let response: any;
		try {
			response = await fetcher.delete(url, ids);
			if (!validMember(response))
				throw new TypeError("Unexpected response to DELETE " + url);
		} catch (error) {
			dispatch(setError("Unable to delete member", error));
			return;
		}
		dispatch(setOne(response));
	};

export const addMembers =
	(members: MemberAdd[]): AppThunk<number[]> =>
	async (dispatch, getState) => {
		const { groupName } = selectMembersState(getState());
		const url = `/api/${groupName}/members`;
		let response: any;
		try {
			response = await fetcher.post(url, members);
			if (!validResponse(response))
				throw new TypeError("Unexpected response to POST " + url);
		} catch (error) {
			dispatch(setError("Unable to add members", error));
			return [];
		}
		dispatch(addMany(response));
		return response.map((m) => m.SAPIN);
	};

export const deleteMembers =
	(ids: number[]): AppThunk =>
	async (dispatch, getState) => {
		const { groupName } = selectMembersState(getState());
		const url = `/api/${groupName}/members`;
		dispatch(removeMany(ids));
		try {
			await fetcher.delete(url, ids);
		} catch (error) {
			dispatch(setError(`Unable to delete members ${ids}`, error));
		}
	};

export const UploadFormat = {
	Members: "members",
	SAPINs: "sapins",
	Emails: "emails",
	History: "history",
	Roster: "roster", // XXX Add during typescipt conversion
};

export const uploadMembers =
	(format: string, file: any): AppThunk =>
	async (dispatch, getState) => {
		const { groupName } = selectMembersState(getState());
		if (!groupName) {
			dispatch(
				setError("Unable to upload members", "Group not selected")
			);
			return;
		}
		const url = `/api/${groupName}/members/upload/${format}`;
		dispatch(getPending({ groupName }));
		let response: any;
		try {
			response = await fetcher.postMultipart(url, { File: file });
			if (!validResponse(response))
				throw new TypeError("Unexpected response to POST " + url);
		} catch (error) {
			dispatch(getFailure());
			dispatch(setError("Unable to upload users", error));
			return;
		}
		dispatch(getSuccess(response));
	};

export const deleteSelectedMembers =
	(): AppThunk => async (dispatch, getState) => {
		const state = getState();
		const selected = selectMembersState(state).selected;
		const shown = membersSelectors.selectSortedFilteredIds(state);
		const ids = selected.filter((id) => shown.includes(id));
		dispatch(deleteMembers(ids as number[]));
	};

export const exportMyProjectRoster =
	(): AppThunk => async (dispatch, getState) => {
		const { groupName } = selectMembersState(getState());
		if (!groupName) {
			dispatch(setError("Unable to export roster", "Group not selected"));
			return;
		}
		const url = `/api/${groupName}/members/MyProjectRoster`;
		try {
			await fetcher.getFile(url);
		} catch (error) {
			dispatch(setError("Unable to get file", error));
		}
	};

export const importMyProjectRoster =
	(file: any): AppThunk =>
	async (dispatch, getState) => {
		const { groupName } = selectMembersState(getState());
		if (!groupName) {
			dispatch(setError("Unable to import roster", "Group not selected"));
			return;
		}
		const url = `/api/${groupName}/members/MyProjectRoster`;
		dispatch(getPending({ groupName }));
		let response: any;
		try {
			response = await fetcher.postMultipart(url, { File: file });
			if (!validResponse(response))
				throw new TypeError("Unexpected response to POST " + url);
		} catch (error) {
			dispatch(getFailure());
			dispatch(setError("Unable to upload roster", error));
			return;
		}
		dispatch(getSuccess(response));
	};
