import React from "react";
import { DateTime } from "luxon";
import isEqual from "lodash.isequal";
import {
	ConfirmModal,
	deepDiff,
	deepMergeTagMultiple,
	deepMerge,
} from "@common";

import { useAppSelector, useAppDispatch } from "@/store/hooks";
import {
	selectMemberEntities,
	memberContactInfoEmpty,
	Member,
	MemberCreate,
	MemberChange,
	ContactEmail,
	ContactInfo,
	StatusChangeEntry,
} from "@/store/members";
import { selectSessionByNumber, Session } from "@/store/sessions";
import {
	setSelected,
	selectImatAttendanceSummaryState,
	selectImatAttendanceSummarySelected,
	selectImatAttendanceSummaryEntities,
	type ImatAttendanceSummary,
} from "@/store/imatAttendanceSummary";
import {
	getNullAttendanceSummary,
	selectAttendanceSummaryEntitiesForSession,
	SessionAttendanceSummary,
	SessionAttendanceSummaryChange,
} from "@/store/attendanceSummaries";

import {
	useMembersAdd,
	useMembersUpdate,
	type MultipleMember,
} from "./useMemberActions";
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

	return deepDiff(member, memberChanges);
}

export type EditAction = "view" | "update" | "add";

export type MemberAttendanceEditState = {
	action: EditAction;
	editedMember: MultipleMember | null;
	createdMember: MultipleMember | null;
	savedMember: MultipleMember | null;
	members: MemberCreate[];
	editedAttendance: MultipleSessionAttendanceSummary | null;
	savedAttendance: MultipleSessionAttendanceSummary | null;
	attendances: SessionAttendanceSummary[];
	message: string;
};

function useInitState(sessionNumber: number) {
	const session = useAppSelector((state) =>
		selectSessionByNumber(state, sessionNumber)
	)!;

	const { loading, valid } = useAppSelector(selectImatAttendanceSummaryState);
	const selected = useAppSelector(selectImatAttendanceSummarySelected);
	const attendeeEntities = useAppSelector(
		selectImatAttendanceSummaryEntities
	);
	const memberEntities = useAppSelector(selectMemberEntities);
	const attendanceSummaryEntities = useAppSelector((state) =>
		selectAttendanceSummaryEntitiesForSession(state, session.id)
	);

	const members: MemberCreate[] = [],
		attendances: SessionAttendanceSummary[] = [];
	let action: EditAction = "view",
		editedMember: MultipleMember | null = null,
		savedMember: MultipleMember | null = null,
		editedAttendance: MultipleSessionAttendanceSummary | null = null,
		message: string = "";

	if (loading && !valid) {
		message = "Loading...";
	} else if (selected.length === 0) {
		message = "Nothing selected";
	} else if (selected.every((id) => Boolean(memberEntities[id]))) {
		// All selected are existing members
		for (const sapin of selected as number[]) {
			const member = memberEntities[sapin]!;
			const attendee = attendeeEntities[sapin];
			if (!attendee) throw new Error("Invalid selection");
			const changes = sessionAttendeeMemberChanges(member, attendee);
			editedMember = deepMergeTagMultiple(
				editedMember || {},
				deepMerge(member, changes)
			) as MultipleMember;
			savedMember = deepMergeTagMultiple(
				savedMember || {},
				member
			) as MultipleMember;
			members.push(member);

			const attendanceSummary =
				attendanceSummaryEntities[sapin] ||
				getNullAttendanceSummary(session.id, sapin);
			editedAttendance = deepMergeTagMultiple(
				editedAttendance || {},
				attendanceSummary
			) as MultipleSessionAttendanceSummary;
			attendances.push(attendanceSummary);
		}
		if (isEqual(editedMember, savedMember)) {
			savedMember = editedMember;
		} else if (editedMember) {
			action = "update";
		}
	} else if (selected.every((id) => !memberEntities[id])) {
		// All selected are new attendees
		action = "add";
		for (const sapin of selected as number[]) {
			const attendee = attendeeEntities[sapin];
			if (!attendee) throw new Error("Invalid selection");
			const newMember = sessionAttendeeToNewMember(attendee, session);
			editedMember = deepMergeTagMultiple(
				editedMember || {},
				newMember
			) as MultipleMember;
			members.push(newMember);
		}
		savedMember = editedMember;
	} else {
		message = "Mix of new attendees and existing members selected";
	}

	return {
		action,
		editedMember,
		createdMember: editedMember,
		savedMember,
		members,
		editedAttendance,
		savedAttendance: editedAttendance,
		attendances,
		message,
	} satisfies MemberAttendanceEditState;
}

export function useMemberAttendanceEdit(
	sessionNumber: number,
	readOnly: boolean
) {
	const dispatch = useAppDispatch();
	const selected = useAppSelector(selectImatAttendanceSummarySelected);
	const initState = useInitState(sessionNumber);

	const [state, setState] =
		React.useState<MemberAttendanceEditState>(initState);

	React.useEffect(() => {
		const { action, editedMember, createdMember, members } = state;
		const ids = members.map((m) => m.SAPIN);
		if (action === "view" && selected.join() !== ids.join()) {
			setState(initState);
		} else if (
			(action === "update" || action === "add") &&
			selected.join() !== ids.join()
		) {
			if (editedMember === createdMember) {
				// No edits made
				setState(initState);
				return;
			}
			ConfirmModal.show(
				"Changes not applied! Do you want to discard changes?"
			).then((ok) => {
				if (ok) setState(initState);
				else dispatch(setSelected(ids)); // Revert to previously selected
			});
		}
	}, [state, selected, setState, initState]);

	const membersAdd = useMembersAdd();
	const membersUpdate = useMembersUpdate();
	const attendanceUpdate = useAttendanceUpdate();

	const actions = React.useMemo(() => {
		const changeMember = (changes: MemberChange) => {
			if (
				readOnly ||
				state.editedMember === null ||
				state.savedMember === null
			) {
				console.warn("Update with unexpected state");
				return;
			}
			setState((state) => {
				const { savedMember, editedAttendance, savedAttendance } =
					state;
				let { action, editedMember } = state;
				editedMember = { ...editedMember!, ...changes };
				if (isEqual(editedMember, savedMember)) {
					if (
						action !== "add" &&
						editedAttendance === savedAttendance
					)
						action = "view";
					editedMember = savedMember!;
				} else {
					if (action !== "add") action = "update";
				}
				return {
					...state,
					action,
					editedMember,
					savedMember,
				};
			});
		};

		const changeAttendance = (changes: SessionAttendanceSummaryChange) => {
			if (readOnly || state.editedAttendance === null) {
				throw new Error("Update with unexpected state");
			}
			setState((state) => {
				const { savedMember, savedAttendance, editedMember } = state;
				let { action, editedAttendance } = state;
				editedAttendance = { ...editedAttendance!, ...changes };
				if (isEqual(editedAttendance, savedAttendance)) {
					if (action !== "add" && editedMember === savedMember)
						action = "view";
					editedAttendance = savedAttendance!;
				} else {
					if (action !== "add") action = "update";
				}
				return {
					...state,
					action,
					editedAttendance,
					savedAttendance,
				} satisfies MemberAttendanceEditState;
			});
		};

		const hasChanges = () =>
			state.editedMember !== state.savedMember ||
			state.editedAttendance !== state.savedAttendance;

		const add = async () => {
			const { action, editedMember, savedMember, members } = state;
			if (
				action !== "add" ||
				editedMember === null ||
				savedMember === null
			) {
				console.warn("Add with unexpected state");
				return;
			}
			const ids = await membersAdd(editedMember, savedMember, members);
			dispatch(setSelected(ids));
			setState(initState);
		};

		const update = async () => {
			const {
				action,
				editedMember,
				savedMember,
				members,
				editedAttendance,
				savedAttendance,
				attendances,
			} = state;
			if (
				action !== "update" ||
				editedMember === null ||
				savedMember === null ||
				editedAttendance === null ||
				savedAttendance === null
			) {
				console.warn("Update with unexpected state");
				return;
			}
			await membersUpdate(editedMember, savedMember, members);
			await attendanceUpdate(
				editedAttendance,
				savedAttendance,
				attendances
			);
			setState(initState);
		};

		const submit = async () => {
			if (state.action === "add") return add();
			else if (state.action === "update") return update();
		};

		const cancel = () => {
			setState((state) => {
				const { action, savedMember, savedAttendance } = state;
				if (action === "add") return state;
				return {
					...state,
					action: "view",
					editedMember: savedMember,
					editedAttendance: savedAttendance,
				};
			});
		};

		return { submit, cancel, hasChanges, changeMember, changeAttendance };
	}, [membersAdd, membersUpdate, attendanceUpdate, initState, readOnly]);

	return { state, ...actions };
}
