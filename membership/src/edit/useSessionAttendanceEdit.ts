import React from "react";
import { DateTime } from "luxon";
import isEqual from "lodash.isequal";
import { deepDiff, deepMerge } from "@common";

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
	selectImatAttendanceSummarySelected,
	selectImatAttendanceSummaryEntities,
	selectImatAttendanceSummarySession,
	type ImatAttendanceSummary,
} from "@/store/imatAttendanceSummary";
import {
	getNullAttendanceSummary,
	selectAttendanceSummaryEntitiesForSession,
	type SessionAttendanceSummary,
	type SessionAttendanceSummaryChange,
} from "@/store/attendanceSummaries";

import { type MultipleMember } from "./useMemberActions";
import {
	useAttendanceUpdate,
	type MultipleSessionAttendanceSummary,
} from "./useAttendanceActions";

export type { MultipleMember, MultipleSessionAttendanceSummary };

/** Create a new member from attendee */
function sessionAttendeeToNewMember(
	attendee: ImatAttendanceSummary,
	session: Session
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
function sessionAttendeeMemberChanges(
	member: Member,
	attendee: ImatAttendanceSummary
) {
	const memberChanges: MemberChange = {
		Name: attendee.Name,
		FirstName: attendee.FirstName,
		LastName: attendee.LastName,
		MI: attendee.MI,
		Email: attendee.Email,
		Affiliation: attendee.Affiliation,
		ContactInfo: attendee.ContactInfo,
	};
	if (attendee.Employer !== undefined)
		memberChanges.Employer = attendee.Employer;
	if (attendee.ContactInfo !== undefined)
		memberChanges.ContactInfo = attendee.ContactInfo;

	return deepDiff(member, memberChanges) as MemberChange;
}

/** Identify changes to member attendance summary */
function sessionAttendeeAttendanceChanges(
	attendanceSummary: SessionAttendanceSummary,
	attendee: ImatAttendanceSummary
) {
	const changes: SessionAttendanceSummaryChange = {};
	if (
		attendanceSummary.AttendancePercentage !== attendee.AttendancePercentage
	)
		changes.AttendancePercentage = attendee.AttendancePercentage;
	return changes;
}

export type EditAction = "addOne" | "updateOne" | "updateMany" | null;

export type MemberAttendanceEditState =
	| {
			action: "addOne";
			selected: number[];
			sapin: number;
			memberEdit: MemberCreate;
			memberSaved: undefined;
			attendanceEdit: MultipleSessionAttendanceSummary;
			attendanceSaved: MultipleSessionAttendanceSummary;
			attendances: SessionAttendanceSummary[];
	  }
	| {
			action: "updateOne";
			selected: number[];
			sapin: number;
			memberEdit: MultipleMember;
			memberSaved: MultipleMember;
			attendanceEdit: MultipleSessionAttendanceSummary;
			attendanceSaved: MultipleSessionAttendanceSummary;
			attendances: SessionAttendanceSummary[];
	  }
	| {
			action: "updateMany";
			selected: number[];
			adds: MemberCreate[];
			updates: MemberUpdate[];
	  }
	| {
			action: null;
			selected: number[];
			message: string;
	  };

function useInitState(selected: number[]): MemberAttendanceEditState {
	const session = useAppSelector(selectImatAttendanceSummarySession);
	if (!session) throw new Error("No session for IMAT attendance summary");
	const { loading, valid } = useAppSelector(selectImatAttendanceSummaryState);
	const attendeeEntities = useAppSelector(
		selectImatAttendanceSummaryEntities
	);
	const memberEntities = useAppSelector(selectMemberEntities);
	const attendanceSummaryEntities = useAppSelector((state) =>
		selectAttendanceSummaryEntitiesForSession(state, session.id)
	);

	return React.useMemo(() => {
		if (loading && !valid) {
			return {
				action: null,
				selected,
				message: "Loading...",
			} satisfies MemberAttendanceEditState;
		} else if (selected.length === 0) {
			return {
				action: null,
				selected,
				message: "Nothing selected",
			} satisfies MemberAttendanceEditState;
		} else if (selected.length === 1) {
			const sapin = selected[0] as number;
			const member = memberEntities[sapin];
			const attendee = attendeeEntities[sapin];
			if (!attendee) throw new Error("Invalid selection");
			const attendanceSummary =
				attendanceSummaryEntities[sapin] ||
				getNullAttendanceSummary(session.id, sapin);
			const attendanceSaved: MultipleSessionAttendanceSummary =
				attendanceSummary;
			const changes = sessionAttendeeAttendanceChanges(
				attendanceSummary,
				attendee
			);
			const attendanceEdit: MultipleSessionAttendanceSummary =
				Object.keys(changes).length > 0
					? { ...attendanceSummary, ...changes }
					: attendanceSummary;

			if (member) {
				const changes = sessionAttendeeMemberChanges(member, attendee);
				const memberEdit = deepMerge(member, changes);
				const memberSaved = member;
				return {
					action: "updateOne",
					selected,
					sapin,
					memberEdit,
					memberSaved,
					attendanceEdit,
					attendanceSaved,
					attendances: [attendanceSummary],
				} satisfies MemberAttendanceEditState;
			} else {
				const newMember = sessionAttendeeToNewMember(attendee, session);
				return {
					action: "addOne",
					selected,
					sapin,
					memberEdit: newMember,
					memberSaved: undefined,
					attendanceEdit,
					attendanceSaved,
					attendances: [attendanceSummary],
				} satisfies MemberAttendanceEditState;
			}
		} else {
			const updates: MemberUpdate[] = [];
			const adds: MemberCreate[] = [];
			for (const sapin of selected as number[]) {
				const member = memberEntities[sapin];
				const attendee = attendeeEntities[sapin];
				if (!attendee) throw new Error("Invalid selection");
				if (member) {
					const changes = sessionAttendeeMemberChanges(
						member,
						attendee
					);
					if (Object.keys(changes).length > 0)
						updates.push({ id: sapin, changes });
				} else {
					const newMember = sessionAttendeeToNewMember(
						attendee,
						session
					);
					adds.push(newMember);
				}
			}
			return {
				action: "updateMany",
				selected,
				adds,
				updates,
			} satisfies MemberAttendanceEditState;
		}
	}, [
		loading,
		valid,
		selected,
		memberEntities,
		attendeeEntities,
		attendanceSummaryEntities,
		session,
	]);
}

export function useSessionAttendanceEdit(readOnly: boolean) {
	const dispatch = useAppDispatch();
	const selected = useAppSelector(
		selectImatAttendanceSummarySelected
	) as number[];
	const initState = useInitState(selected);

	const [state, setState] =
		React.useState<MemberAttendanceEditState>(initState);

	React.useEffect(() => {
		if (!isEqual(selected, state.selected)) setState(initState);
	}, [selected, state.selected, setState, initState]);

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
		[readOnly, setState]
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
		[readOnly, setState]
	);

	const hasChanges = React.useCallback(
		() =>
			state.action === "addOne" ||
			(state.action === "updateOne" &&
				(state.memberEdit !== state.memberSaved ||
					state.attendanceEdit !== state.attendanceSaved)) ||
			(state.action === "updateMany" &&
				(state.adds.length > 0 || state.updates.length > 0)),
		[state]
	);

	const attendanceUpdate = useAttendanceUpdate();

	const submit = React.useCallback(async () => {
		const { action } = state;
		if (action === "addOne") {
			await dispatch(addMembers([state.memberEdit]));
			setState(initState);
		} else if (action === "updateOne") {
			const changes = deepDiff(
				state.memberSaved,
				state.memberEdit
			) as MemberChange;
			await dispatch(updateMembers([{ id: state.sapin, changes }]));
			await attendanceUpdate(
				state.attendanceEdit,
				state.attendanceSaved,
				state.attendances
			);
			setState({
				...state,
				memberEdit: state.memberSaved,
				attendanceEdit: state.attendanceSaved,
			});
		} else if (action === "updateMany") {
			await dispatch(addMembers(state.adds));
			await dispatch(updateMembers(state.updates));
		}
	}, [attendanceUpdate, state, dispatch, setState, initState]);

	const cancel = React.useCallback(() => {
		setState((state) => {
			const { action } = state;
			if (action === "addOne") return initState;
			else if (action === "updateOne")
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
		memberOnChange,
		attendanceOnChange,
	};
}
