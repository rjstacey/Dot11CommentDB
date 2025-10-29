import { createSelector, createAction } from "@reduxjs/toolkit";
import type { Dictionary, EntityId, Action } from "@reduxjs/toolkit";
import {
	fetcher,
	displayDate,
	createAppTableDataSlice,
	getAppTableDataSelectors,
	FieldType,
	Fields,
} from "@common";
import {
	StatusChangeEntry,
	StatusType,
	StatusExtendedType,
	ContactInfo,
	ContactEmail,
	Member,
	MemberCreate,
	MemberUpdate,
	memberStatusValues,
	activeMemberStatusValues,
	membersSchema,
	memberSchema,
	MemberStatus,
	MembersExportQuery,
} from "@schemas/members";

import type { RootState, AppThunk } from ".";
import { setError } from ".";
import { selectSessionParticipationWithMembershipAndSummary } from "./sessionParticipation";
import { selectBallotParticipationWithMembershipAndSummary } from "./ballotParticipation";
import { selectTopLevelGroupByName, AccessLevel } from "./groups";
import { loadIeeeMembers } from "./ieeeMembers";

export type {
	Member,
	StatusChangeEntry,
	ContactInfo,
	ContactEmail,
	MemberCreate,
	MemberUpdate,
	StatusType,
	StatusExtendedType,
	MemberStatus,
	MembersExportQuery,
};
export { AccessLevel };

export type ExpectedStatusType = StatusType | "";

export function isActiveMember(member: Member) {
	return (
		member.Status === "Voter" ||
		member.Status === "Potential Voter" ||
		member.Status === "Aspirant" ||
		member.Status === "ExOfficio" ||
		member.Status === "Observer"
	);
}

export { memberStatusValues, activeMemberStatusValues };
export const statusOptions = memberStatusValues.map((v) => ({
	value: v,
	label: v,
}));

export type MemberWithParticipation = Member & {
	AttendancesSummary: string;
	BallotParticipationSummary: string;
};

export type MembersDictionary = Dictionary<Member>;

export const memberContactInfoEmpty: ContactInfo = {
	StreetLine1: "",
	StreetLine2: "",
	City: "",
	State: "",
	Zip: "",
	Country: "",
	Phone: "",
	Fax: "",
};

export const fields: Fields = {
	SAPIN: { label: "SA PIN", type: FieldType.NUMERIC },
	Name: { label: "Name" },
	LastName: { label: "Family name" },
	FirstName: { label: "Given name" },
	MI: { label: "MI" },
	Email: { label: "Email" },
	Employer: { label: "Employer" },
	Affiliation: { label: "Affiliation" },
	OldStatus: { label: "Previous status" },
	Status: { label: "Status" },
	StatusChangeDate: {
		label: "Status change date",
		dataRenderer: displayDate,
		type: FieldType.DATE,
	},
	DateAdded: {
		label: "Date added",
		dataRenderer: displayDate,
		type: FieldType.DATE,
	},
	StatusChangeOverride: {
		label: "Status override",
		dataRenderer: (d) => (d ? "YES" : "NO"),
	},
	AttendancesSummary: { label: "Session participation" },
	BallotParticipationSummary: { label: "Ballot participation" },
};

/* Fields derived from other fields */
export function getField(entity: Member, key: string) {
	if (key === "OldStatus") {
		const history = entity.StatusChangeHistory;
		const lastChange = history[0];
		if (lastChange) return lastChange.OldStatus;
		return "";
	}
	if (!(key in entity)) console.warn(dataSet + " has no field " + key);
	return entity[key as keyof Member];
}

/* Slice */
const dataSet = "members";
const selectId = (m: Member) => m.SAPIN;
const sortComparer = (m1: Member, m2: Member) => m1.SAPIN - m2.SAPIN;
const initialState: { groupName: string | null; lastLoad: string | null } = {
	groupName: null,
	lastLoad: null,
};
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
					state.lastLoad = new Date().toISOString();
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
					state.lastLoad = null;
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
export function selectMembersState(state: RootState) {
	return state[dataSet];
}
export function selectMemberIds(state: RootState) {
	return selectMembersState(state).ids;
}
export function selectMemberEntities(state: RootState) {
	return selectMembersState(state).entities;
}
const selectMembersAge = (state: RootState) => {
	const lastLoad = selectMembersState(state).lastLoad;
	if (!lastLoad) return NaN;
	return new Date().valueOf() - new Date(lastLoad).valueOf();
};
export const selectActiveMembers = createSelector(
	selectMemberIds,
	selectMemberEntities,
	(ids, entities) =>
		ids
			.map((id) => entities[id]!)
			.filter(isActiveMember)
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

export const selectSelectedMembers = createSelector(
	(state: RootState) => selectMembersState(state).selected,
	selectMemberEntities,
	(ids, entities) =>
		ids.map((id) => entities[id]).filter((m) => Boolean(m)) as Member[]
);

export const selectMemberWithParticipationSummary = createSelector(
	selectSessionParticipationWithMembershipAndSummary,
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
	return ids.filter(
		(id) => new Date(entities[id]!.StatusChangeDate || "") > date
	);
}

export const membersSelectors = getAppTableDataSelectors(selectMembersState, {
	selectEntities: selectMemberWithParticipationSummary,
	getField,
});

export const selectUiProperties = membersSelectors.selectUiProperties;

export const selectUserMembersAccess = (state: RootState) => {
	const { groupName } = selectMembersState(state);
	const group = groupName
		? selectTopLevelGroupByName(state, groupName)
		: undefined;
	return group?.permissions.members || AccessLevel.none;
};

/* Thunk actions */
const AGE_STALE = 60 * 60 * 1000; // 1 hour

let loading = false;
let loadingPromise: Promise<void> = Promise.resolve();
export const loadMembers =
	(groupName: string, force = false): AppThunk<void> =>
	(dispatch, getState) => {
		const state = getState();
		const currentGroupName = selectMembersState(state).groupName;
		if (currentGroupName === groupName) {
			if (loading) return loadingPromise;
			const age = selectMembersAge(state);
			if (!force && age && age < AGE_STALE) return loadingPromise;
		}
		dispatch(getPending({ groupName }));
		const url = `/api/${groupName}/members`;
		loading = true;
		loadingPromise = fetcher
			.get(url)
			.then((response) => {
				const members = membersSchema.parse(response);
				dispatch(getSuccess(members));
			})
			.catch((error) => {
				dispatch(getFailure());
				dispatch(setError("GET " + url, error));
			})
			.finally(() => {
				loading = false;
			});
		return loadingPromise;
	};

export const updateMembers =
	(updates: MemberUpdate[]): AppThunk =>
	async (dispatch, getState) => {
		const { groupName } = selectMembersState(getState());
		const url = `/api/${groupName}/members`;
		let members: Member[];
		try {
			const response = await fetcher.patch(url, updates);
			members = membersSchema.parse(response);
		} catch (error) {
			dispatch(setError("PATCH " + url, error));
			return;
		}
		dispatch(setMany(members));
	};

type StatusChangeEntryUpdate = {
	id: number;
	changes: Partial<StatusChangeEntry>;
};

export const addMemberStatusChangeEntries =
	(sapin: number, entries: StatusChangeEntry[]): AppThunk =>
	async (dispatch, getState) => {
		const { groupName } = selectMembersState(getState());
		const url = `/api/${groupName}/members/${sapin}/StatusChangeHistory`;
		let member: Member;
		try {
			const response = await fetcher.put(url, entries);
			member = memberSchema.parse(response);
		} catch (error) {
			dispatch(setError("PUT " + url, error));
			return;
		}
		dispatch(setOne(member));
	};

export const updateMemberStatusChangeEntries =
	(sapin: number, updates: StatusChangeEntryUpdate[]): AppThunk =>
	async (dispatch, getState) => {
		const { groupName } = selectMembersState(getState());
		const url = `/api/${groupName}/members/${sapin}/StatusChangeHistory`;
		let member: Member;
		try {
			const response = await fetcher.patch(url, updates);
			member = memberSchema.parse(response);
		} catch (error) {
			dispatch(setError("Unable to update member", error));
			return;
		}
		dispatch(setOne(member));
	};

export const deleteMemberStatusChangeEntries =
	(sapin: number, ids: number[]): AppThunk =>
	async (dispatch, getState) => {
		const { groupName } = selectMembersState(getState());
		const url = `/api/${groupName}/members/${sapin}/StatusChangeHistory`;
		let member: Member;
		try {
			const response = await fetcher.delete(url, ids);
			member = memberSchema.parse(response);
		} catch (error) {
			dispatch(setError("DELETE " + url, error));
			return;
		}
		dispatch(setOne(member));
	};

export const addMembers =
	(adds: MemberCreate[]): AppThunk<number[]> =>
	async (dispatch, getState) => {
		const { groupName } = selectMembersState(getState());
		const url = `/api/${groupName}/members`;
		let members: Member[];
		try {
			const response = await fetcher.post(url, adds);
			members = membersSchema.parse(response);
		} catch (error) {
			dispatch(setError("POST " + url, error));
			return [];
		}
		dispatch(addMany(members));
		return members.map((m) => m.SAPIN);
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
			dispatch(setError("DELETE " + url, error));
		}
		await dispatch(loadIeeeMembers(true));
	};

export const UploadFormat = {
	Members: "members",
	SAPINs: "sapins",
	Emails: "emails",
	History: "history",
	Roster: "roster", // XXX Add during typescipt conversion
};

export const uploadMembers =
	(format: string, file: File): AppThunk =>
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
		let members: Member[];
		try {
			const response = await fetcher.postFile(url, file);
			members = membersSchema.parse(response);
		} catch (error) {
			dispatch(getFailure());
			dispatch(setError("POST " + url, error));
			return;
		}
		dispatch(getSuccess(members));
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
			dispatch(setError("GET " + url, error));
		}
	};

export const exportMembersPublic =
	(): AppThunk => async (dispatch, getState) => {
		const { groupName } = selectMembersState(getState());
		if (!groupName) {
			dispatch(
				setError("Unable to export member list", "Group not selected")
			);
			return;
		}
		const url = `/api/${groupName}/members/public`;
		try {
			await fetcher.getFile(url);
		} catch (error) {
			dispatch(setError("GET " + url, error));
		}
	};

export const exportMembersPrivate =
	(): AppThunk => async (dispatch, getState) => {
		const { groupName } = selectMembersState(getState());
		if (!groupName) {
			dispatch(
				setError("Unable to export member list", "Group not selected")
			);
			return;
		}
		const url = `/api/${groupName}/members/private`;
		try {
			await fetcher.getFile(url);
		} catch (error) {
			dispatch(setError("GET " + url, error));
		}
	};

export const exportMembers =
	(query?: MembersExportQuery): AppThunk =>
	async (dispatch, getState) => {
		const { groupName } = selectMembersState(getState());
		if (!groupName) {
			dispatch(
				setError("Unable to export member list", "Group not selected")
			);
			return;
		}
		let url = `/api/${groupName}/members/export`;
		const search = new URLSearchParams();
		if (query?.status) {
			if (Array.isArray(query.status))
				query.status.forEach((s) => search.append("status", s));
			else search.append("status", query.status);
		}
		if (query?.format) search.append("format", query.format);
		if (query?.date) search.append("date", query.date);
		if (search.size > 0) url += "?" + search.toString();
		try {
			await fetcher.getFile(url);
		} catch (error) {
			dispatch(setError("GET " + url, error));
		}
	};
