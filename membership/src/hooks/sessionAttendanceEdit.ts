import { useCallback, useEffect, useReducer } from "react";
import { DateTime } from "luxon";
import isEqual from "lodash.isequal";
import { shallowDiff, deepMerge } from "@common";

import { useAppSelector, useAppDispatch } from "@/store/hooks";
import {
	selectMemberEntities,
	memberContactInfoEmpty,
	addMembers,
	updateMembers,
	type Member,
	type MemberCreate,
	type MemberChange,
	type MemberUpdate,
	type ContactEmail,
	type ContactInfo,
	type StatusChangeEntry,
} from "@/store/members";
import type { Session } from "@/store/sessions";
import {
	selectImatAttendanceSummaryState,
	selectImatAttendanceSummarySession,
	selectImatAttendanceSummarySyncedEntities,
	type ImatAttendanceSummary,
	type SyncedSessionAttendee,
} from "@/store/imatAttendanceSummary";
import {
	addAttendanceSummaries,
	updateAttendanceSummaries,
	deleteAttendanceSummaries,
	getNullAttendanceSummary,
	type SessionAttendanceSummaryCreate,
	type SessionAttendanceSummaryChange,
	type SessionAttendanceSummaryUpdate,
	type SessionAttendanceSummary,
} from "@/store/attendanceSummaries";

/** Create a new member from attendee */
export function sessionAttendeeToNewMember(
	attendee: ImatAttendanceSummary,
	session: Session,
) {
	const date = DateTime.fromISO(session.startDate, {
		zone: session.timezone,
	}).toISO()!;
	const status = "Non-Voter";
	const contactEmail: ContactEmail = {
		id: 0,
		Email: attendee.Email,
		Primary: true,
		Broken: false,
		DateAdded: date,
	};
	const contactInfo: ContactInfo =
		attendee.ContactInfo || memberContactInfoEmpty;
	const statusChange: StatusChangeEntry = {
		id: 0,
		OldStatus: status,
		NewStatus: status,
		Reason: "New member",
		Date: date,
	};
	const member: MemberCreate = {
		SAPIN: attendee.SAPIN,
		Name: attendee.Name,
		FirstName: attendee.FirstName,
		LastName: attendee.LastName,
		MI: attendee.MI,
		Email: attendee.Email,
		Affiliation: attendee.Affiliation,
		Employer: attendee.Employer || "",
		ContactInfo: contactInfo,
		ContactEmails: [contactEmail],
		Status: status,
		StatusChangeOverride: false,
		StatusChangeDate: date,
		StatusChangeHistory: [statusChange],
		DateAdded: date,
	};

	return member;
}

/** Identify changes to an existing member */
function sessionAttendeeMemberChanges(entity: SyncedSessionAttendee) {
	const changes: MemberChange = {};
	const member = entity.member;
	if (member) {
		if (entity.Name.toLowerCase() !== member.Name.toLowerCase())
			changes.Name = entity.Name;
		if (entity.Email.toLowerCase() !== member.Email.toLowerCase())
			changes.Email = entity.Email;
		if (entity.Affiliation !== member.Affiliation)
			changes.Affiliation = entity.Affiliation;
		if (entity.Employer && entity.Employer !== member.Employer)
			changes.Employer = entity.Employer;
		if (
			entity.ContactInfo &&
			!isEqual(entity.ContactInfo, member.ContactInfo)
		)
			changes.ContactInfo = entity.ContactInfo;
	}
	return changes;
}

/** Identify changes to member attendance summary */
function sessionAttendeeAttendanceChanges(entity: SyncedSessionAttendee) {
	const changes: SessionAttendanceSummaryChange = {};
	const attendance = entity.attendance;
	if (attendance) {
		const aPct1 = entity.AttendancePercentage.toFixed(1);
		const aPct2 = attendance.AttendancePercentage?.toFixed(1) || "0";
		if (aPct1 !== aPct2)
			changes.AttendancePercentage = entity.AttendancePercentage;
	}
	return changes;
}

export type EditAction = "addOne" | "updateOne" | "updateMany" | null;

export type SessionAttendanceAddOneState = {
	action: "addOne";
	ids: number[];
	memberEdit: MemberCreate;
	memberSaved: undefined;
	attendanceEdit: SessionAttendanceSummary;
	attendanceSaved: SessionAttendanceSummary;
};

export type SessionAttendanceUpdateOneState = {
	action: "updateOne";
	ids: number[];
	memberEdit: Member;
	memberSaved: Member;
	attendanceEdit: SessionAttendanceSummary;
	attendanceSaved: SessionAttendanceSummary;
};

export type SessionAttendanceUpdateManyState = {
	action: "updateMany";
	ids: number[];
	memberAdds: MemberCreate[];
	memberUpdates: MemberUpdate[];
	attendanceAdds: SessionAttendanceSummaryCreate[];
	attendanceUpdates: SessionAttendanceSummaryUpdate[];
	attendanceDeletes: number[];
};

export type SessionAttendanceEditState =
	| SessionAttendanceAddOneState
	| SessionAttendanceUpdateOneState
	| SessionAttendanceUpdateManyState
	| {
			action: null;
			ids: number[];
			message: string;
	  };
type SessionAttendanceEditAction =
	| {
			type: "INIT";
	  }
	| {
			type: "CHANGE_ATTENDANCE";
			changes: SessionAttendanceSummaryChange;
	  }
	| {
			type: "CHANGE_MEMBER";
			changes: MemberChange;
	  }
	| {
			type: "SUBMIT";
	  }
	| {
			type: "CANCEL";
	  };
const INIT = { type: "INIT" } as const;
const SUBMIT = { type: "SUBMIT" } as const;
const CHANGE_ATTENDANCE = (changes: SessionAttendanceSummaryChange) =>
	({ type: "CHANGE_ATTENDANCE", changes }) as const;
const CHANGE_MEMBER = (changes: MemberChange) =>
	({ type: "CHANGE_MEMBER", changes }) as const;
const CANCEL = { type: "CANCEL" } as const;

function useSessionAttendanceEditReducer(ids: number[], readOnly: boolean) {
	const session = useAppSelector(selectImatAttendanceSummarySession);
	const { loading, valid } = useAppSelector(selectImatAttendanceSummaryState);
	const memberEntities = useAppSelector(selectMemberEntities);
	const synchedEntities = useAppSelector(
		selectImatAttendanceSummarySyncedEntities,
	);

	const initState = useCallback(() => {
		if (!session) throw new Error("No session for IMAT attendance summary");
		if (loading && !valid) {
			return {
				action: null,
				ids,
				message: "Loading...",
			} satisfies SessionAttendanceEditState;
		} else if (ids.length === 0) {
			return {
				action: null,
				ids,
				message: "Nothing selected",
			} satisfies SessionAttendanceEditState;
		} else if (ids.length === 1) {
			const sapin = ids[0];
			const member = memberEntities[sapin];
			const entity = synchedEntities[sapin];
			const changes = sessionAttendeeAttendanceChanges(entity);
			const attendance =
				entity.attendance ||
				getNullAttendanceSummary(session.id, sapin);
			const attendanceSaved: SessionAttendanceSummary = attendance;
			const attendanceEdit: SessionAttendanceSummary =
				Object.keys(changes).length > 0
					? { ...attendance, ...changes }
					: attendance;
			if (member) {
				const changes = sessionAttendeeMemberChanges(entity);
				const memberEdit =
					Object.keys(changes).length > 0
						? deepMerge(member, changes)
						: member;
				const memberSaved = member;
				return {
					action: "updateOne",
					ids,
					memberEdit,
					memberSaved,
					attendanceEdit,
					attendanceSaved,
				} satisfies SessionAttendanceEditState;
			} else {
				const newMember = sessionAttendeeToNewMember(entity, session);
				return {
					action: "addOne",
					ids,
					memberEdit: newMember,
					memberSaved: undefined,
					attendanceEdit,
					attendanceSaved,
				} satisfies SessionAttendanceEditState;
			}
		} else {
			const memberAdds: MemberCreate[] = [];
			const memberUpdates: MemberUpdate[] = [];
			const attendanceAdds: SessionAttendanceSummaryCreate[] = [];
			const attendanceUpdates: SessionAttendanceSummaryUpdate[] = [];
			const attendanceDeletes: number[] = [];
			for (const sapin of ids) {
				const member = memberEntities[sapin];
				const entity = synchedEntities[sapin];
				if (member) {
					const changes = sessionAttendeeMemberChanges(entity);
					if (Object.keys(changes).length > 0)
						memberUpdates.push({ id: sapin, changes });
				} else {
					const newMember = sessionAttendeeToNewMember(
						entity,
						session,
					);
					memberAdds.push(newMember);
				}
				const attendance = entity.attendance;
				if (attendance?.id) {
					const changes = sessionAttendeeAttendanceChanges(entity);
					if (Object.keys(changes).length > 0) {
						if (attendance.id) {
							attendanceUpdates.push({
								id: attendance.id,
								changes,
							});
						}
					} else if (!attendance.AttendancePercentage) {
						// Delete entries with no attendance
						attendanceDeletes.push(attendance.id);
					}
				} else if (entity.AttendancePercentage) {
					const a = {
						...getNullAttendanceSummary(session.id, sapin),
						AttendancePercentage: entity.AttendancePercentage,
					};
					attendanceAdds.push(a);
				}
			}
			return {
				action: "updateMany",
				ids,
				memberAdds,
				memberUpdates,
				attendanceAdds,
				attendanceUpdates,
				attendanceDeletes,
			} satisfies SessionAttendanceEditState;
		}
	}, [loading, valid, ids, memberEntities, synchedEntities, session]);

	const reducer = useCallback(
		(
			state: SessionAttendanceEditState,
			action: SessionAttendanceEditAction,
		): SessionAttendanceEditState => {
			if (action.type === "INIT") {
				return initState();
			}
			if (action.type === "CHANGE_MEMBER") {
				if (readOnly) {
					console.warn("Change member while read-only");
					return state;
				}
				if (state.action === "addOne") {
					const memberEdit = {
						...state.memberEdit,
						...action.changes,
					};
					return { ...state, memberEdit };
				} else if (state.action === "updateOne") {
					let memberEdit = {
						...state.memberEdit,
						...action.changes,
					};
					if (isEqual(memberEdit, state.memberSaved))
						memberEdit = state.memberSaved;
					return { ...state, memberEdit };
				}
				console.warn("Change member in unexpected state");
				return state;
			}
			if (action.type === "CHANGE_ATTENDANCE") {
				if (readOnly) {
					console.warn("Change attendance while read-only");
					return state;
				}
				if (state.action === "addOne" || state.action === "updateOne") {
					let attendanceEdit = {
						...state.attendanceEdit,
						...action.changes,
					};
					if (isEqual(attendanceEdit, state.attendanceSaved))
						attendanceEdit = state.attendanceSaved;
					return {
						...state,
						attendanceEdit,
					};
				}
				return state;
			}
			if (action.type === "SUBMIT") {
				if (state.action === "addOne") {
					return initState();
				}
				if (state.action === "updateOne") {
					return {
						...state,
						memberSaved: state.memberEdit,
						attendanceSaved: state.attendanceEdit,
					};
				}
				return state;
			}
			if (action.type === "CANCEL") {
				if (state.action === "addOne") return initState();
				if (state.action === "updateOne")
					return {
						...state,
						memberEdit: state.memberSaved,
						attendanceEdit: state.attendanceSaved,
					};
				return state;
			}
			throw new Error("Unknown action: " + action);
		},
		[readOnly, initState],
	);

	return useReducer(reducer, undefined, initState);
}

export function useSessionAttendanceEdit(ids: number[], readOnly: boolean) {
	const dispatch = useAppDispatch();
	const [state, dispatchStateAction] = useSessionAttendanceEditReducer(
		ids,
		readOnly,
	);

	useEffect(() => {
		if (!isEqual(ids, state.ids)) dispatchStateAction(INIT);
	}, [ids, dispatchStateAction]);

	const memberOnChange = useCallback(
		(changes: MemberChange) => {
			dispatchStateAction(CHANGE_MEMBER(changes));
		},
		[dispatchStateAction],
	);

	const attendanceOnChange = useCallback(
		(changes: SessionAttendanceSummaryChange) => {
			dispatchStateAction(CHANGE_ATTENDANCE(changes));
		},
		[dispatchStateAction],
	);

	const hasMemberChanges = useCallback(
		() =>
			state.action === "addOne" ||
			(state.action === "updateOne" &&
				state.memberEdit !== state.memberSaved) ||
			(state.action === "updateMany" &&
				(state.memberAdds.length > 0 ||
					state.memberUpdates.length > 0)),
		[state],
	);

	const hasAttendanceChanges = useCallback(
		() =>
			state.action === "addOne" ||
			(state.action === "updateOne" &&
				state.attendanceEdit !== state.attendanceSaved) ||
			(state.action === "updateMany" &&
				(state.attendanceAdds.length > 0 ||
					state.attendanceUpdates.length > 0 ||
					state.attendanceDeletes.length > 0)),
		[state],
	);

	const hasChanges = useCallback(
		() => hasMemberChanges() || hasAttendanceChanges(),
		[hasMemberChanges, hasAttendanceChanges],
	);

	const submit = useCallback(
		async (
			doAddMembers = true,
			doUpdateMembers = true,
			doUpdateAttendance = true,
		) => {
			if (state.action === "addOne" || state.action === "updateOne") {
				if (doUpdateAttendance) {
					const id = state.attendanceSaved.id;
					if (id) {
						const changes = shallowDiff(
							state.attendanceSaved,
							state.attendanceEdit,
						) as SessionAttendanceSummaryChange;
						if (Object.keys(changes).length > 0) {
							await dispatch(
								updateAttendanceSummaries([{ id, changes }]),
							);
						}
					} else {
						await dispatch(
							addAttendanceSummaries([state.attendanceEdit]),
						);
					}
				}
				if (state.action === "addOne") {
					if (doAddMembers) {
						await dispatch(addMembers([state.memberEdit]));
					}
				} else if (state.action === "updateOne") {
					if (doUpdateMembers) {
						const id = state.ids[0];
						const changes = shallowDiff(
							state.memberSaved,
							state.memberEdit,
						) as MemberChange;
						if (changes) {
							await dispatch(updateMembers([{ id, changes }]));
						}
					}
				}
				dispatchStateAction(SUBMIT);
			} else if (state.action === "updateMany") {
				if (doAddMembers) await dispatch(addMembers(state.memberAdds));
				if (doUpdateMembers)
					await dispatch(updateMembers(state.memberUpdates));
				if (doUpdateAttendance) {
					await Promise.all([
						dispatch(addAttendanceSummaries(state.attendanceAdds)),
						dispatch(
							updateAttendanceSummaries(state.attendanceUpdates),
						),
						dispatch(
							deleteAttendanceSummaries(state.attendanceDeletes),
						),
					]);
				}
			}
		},
		[state, dispatch, dispatchStateAction],
	);

	const cancel = useCallback(() => {
		dispatchStateAction(CANCEL);
	}, [dispatchStateAction]);

	return {
		state,
		submit,
		cancel,
		hasChanges,
		hasMemberChanges,
		hasAttendanceChanges,
		memberOnChange,
		attendanceOnChange,
	};
}
