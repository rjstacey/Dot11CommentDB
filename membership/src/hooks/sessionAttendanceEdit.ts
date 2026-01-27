import React from "react";
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
	type SessionAttendanceSummaryCreate,
	type SessionAttendanceSummaryChange,
	type SessionAttendanceSummaryUpdate,
	type SessionAttendanceSummary,
	getNullAttendanceSummary,
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

export type MemberAttendanceEditState =
	| {
			action: "addOne";
			ids: number[];
			memberEdit: MemberCreate;
			memberSaved: undefined;
			attendanceEdit: SessionAttendanceSummary;
			attendanceSaved: SessionAttendanceSummary;
	  }
	| {
			action: "updateOne";
			ids: number[];
			memberEdit: Member;
			memberSaved: Member;
			attendanceEdit: SessionAttendanceSummary;
			attendanceSaved: SessionAttendanceSummary;
	  }
	| {
			action: "updateMany";
			ids: number[];
			memberAdds: MemberCreate[];
			memberUpdates: MemberUpdate[];
			attendanceAdds: SessionAttendanceSummaryCreate[];
			attendanceUpdates: SessionAttendanceSummaryUpdate[];
			attendanceDeletes: number[];
	  }
	| {
			action: null;
			ids: number[];
			message: string;
	  };

function useInitState(ids: number[]): MemberAttendanceEditState {
	const session = useAppSelector(selectImatAttendanceSummarySession);
	if (!session) throw new Error("No session for IMAT attendance summary");
	const { loading, valid } = useAppSelector(selectImatAttendanceSummaryState);
	const memberEntities = useAppSelector(selectMemberEntities);
	const synchedEntities = useAppSelector(
		selectImatAttendanceSummarySyncedEntities,
	);

	return React.useMemo(() => {
		if (loading && !valid) {
			return {
				action: null,
				ids,
				message: "Loading...",
			} satisfies MemberAttendanceEditState;
		} else if (ids.length === 0) {
			return {
				action: null,
				ids,
				message: "Nothing selected",
			} satisfies MemberAttendanceEditState;
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
				} satisfies MemberAttendanceEditState;
			} else {
				const newMember = sessionAttendeeToNewMember(entity, session);
				return {
					action: "addOne",
					ids,
					memberEdit: newMember,
					memberSaved: undefined,
					attendanceEdit,
					attendanceSaved,
				} satisfies MemberAttendanceEditState;
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
				if (attendance) {
					const changes = sessionAttendeeAttendanceChanges(entity);
					if (Object.keys(changes).length > 0) {
						attendanceUpdates.push({
							id: attendance.id,
							changes,
						});
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
			} satisfies MemberAttendanceEditState;
		}
	}, [loading, valid, ids, memberEntities, synchedEntities, session]);
}

export function useSessionAttendanceEdit(ids: number[], readOnly: boolean) {
	const dispatch = useAppDispatch();

	const initState = useInitState(ids);

	const [state, setState] =
		React.useState<MemberAttendanceEditState>(initState);

	React.useEffect(() => {
		if (!isEqual(ids, state.ids)) setState(initState);
	}, [ids, state.ids, setState, initState]);

	const memberOnChange = React.useCallback(
		(changes: MemberChange) => {
			setState((state) => {
				if (!readOnly) {
					if (state.action === "addOne") {
						const memberEdit = {
							...state.memberEdit,
							...changes,
						};
						return { ...state, memberEdit };
					} else if (state.action === "updateOne") {
						let memberEdit = {
							...state.memberEdit,
							...changes,
						};
						if (isEqual(memberEdit, state.memberSaved))
							memberEdit = state.memberSaved;
						return { ...state, memberEdit };
					}
				}
				console.warn("memberOnChange: bad state");
				return state;
			});
		},
		[readOnly, setState],
	);

	const attendanceOnChange = React.useCallback(
		(changes: SessionAttendanceSummaryChange) => {
			setState((state) => {
				if (
					!readOnly &&
					(state.action === "addOne" || state.action === "updateOne")
				) {
					let attendanceEdit = {
						...state.attendanceEdit,
						...changes,
					};
					if (isEqual(attendanceEdit, state.attendanceSaved))
						attendanceEdit = state.attendanceSaved;
					return {
						...state,
						attendanceEdit,
					};
				}
				console.warn("attendanceOnChange: bad state");
				return state;
			});
		},
		[readOnly, setState],
	);

	const hasMemberChanges = React.useCallback(
		() =>
			state.action === "addOne" ||
			(state.action === "updateOne" &&
				state.memberEdit !== state.memberSaved) ||
			(state.action === "updateMany" &&
				(state.memberAdds.length > 0 ||
					state.memberUpdates.length > 0)),
		[state],
	);

	const hasAttendanceChanges = React.useCallback(
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

	const hasChanges = React.useCallback(
		() => hasMemberChanges() || hasAttendanceChanges(),
		[hasMemberChanges, hasAttendanceChanges],
	);

	const submit = React.useCallback(
		async (
			doAddMembers = true,
			doUpdateMembers = true,
			doUpdateAttendance = true,
		) => {
			const { action } = state;

			if (action === "addOne" || action === "updateOne") {
				if (doUpdateAttendance) {
					const id = state.attendanceSaved.id;
					const changes = shallowDiff(
						state.attendanceSaved,
						state.attendanceEdit,
					) as SessionAttendanceSummaryChange;
					if (Object.keys(changes).length > 0) {
						await dispatch(
							updateAttendanceSummaries([{ id, changes }]),
						);
					}
				}
				if (action === "addOne") {
					if (doAddMembers) {
						await dispatch(addMembers([state.memberEdit]));
					}
					setState(initState);
				}
				if (action === "updateOne") {
					if (doUpdateMembers) {
						const changes = shallowDiff(
							state.memberSaved,
							state.memberEdit,
						) as MemberChange;
						if (changes) {
							await dispatch(
								updateMembers([{ id: state.ids[0], changes }]),
							);
						}
					}
					setState({
						...state,
						memberSaved: state.memberEdit,
						attendanceSaved: state.attendanceEdit,
					});
				}
			} else if (action === "updateMany") {
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
		[state, dispatch, setState, initState],
	);

	const cancel = React.useCallback(() => {
		setState((state) => {
			const { action } = state;
			if (action === "addOne") return initState;
			if (action === "updateOne")
				return {
					...state,
					memberEdit: state.memberSaved,
					attendanceEdit: state.attendanceSaved,
				};
			return state;
		});
	}, [setState, initState]);

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
