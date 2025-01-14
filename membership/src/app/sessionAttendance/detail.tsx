import React from "react";
import { useParams } from "react-router";
import { EntityId } from "@reduxjs/toolkit";
import isEqual from "lodash.isequal";
import { DateTime } from "luxon";
import {
	ConfirmModal,
	deepMergeTagMultiple,
	deepDiff,
	deepMerge,
	shallowDiff,
	Form,
	Row,
	Field,
	Checkbox,
	isMultiple,
	type Multiple,
	MULTIPLE,
} from "dot11-components";

import type { AppThunk } from "@/store";
import { store } from "@/store";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { AccessLevel } from "@/store/user";
import {
	selectMemberEntities,
	selectUserMembersAccess,
	Member,
	MemberCreate,
	ContactEmail,
	ContactInfo,
	memberContactInfoEmpty,
	StatusChangeEntry,
} from "@/store/members";
import { selectSessionByNumber, Session } from "@/store/sessions";
import {
	setSelected,
	selectSessionAttendeesState,
	SessionAttendee,
	selectSessionAttendeesSelected,
	selectSessionAttendeesEntities,
} from "@/store/sessionAttendees";
import {
	getNullAttendanceSummary,
	isNullAttendanceSummary,
	selectAttendanceSummaryEntitiesForSession,
	updateAttendanceSummaries,
	addAttendanceSummaries,
	deleteAttendanceSummaries,
	SessionAttendanceSummary,
	SessionAttendanceSummaryChanges,
	SessionAttendanceSummaryCreate,
	SessionAttendanceSummaryUpdate,
} from "@/store/attendanceSummary";

import {
	MemberBasicInfo,
	MemberDetailInfo,
	emailPattern,
	useMembersAdd,
	useMembersUpdate,
	type MultipleMember,
	type EditAction,
} from "../members/MemberEdit";

import ShowAccess from "@/components/ShowAccess";

/** Identify changes to an existing member */
function sessionAttendeeMemberChanges(
	member: Member,
	attendee: SessionAttendee
) {
	const memberChanges: Partial<Member> = {
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

/** Create a new member from attendee */
export function sessionAttendeeToNewMember(
	attendee: SessionAttendee,
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

function renderAttendancePercentage(pct: typeof MULTIPLE | null | number) {
	return isMultiple(pct) ? (
		<i>(Multiple)</i>
	) : pct === null ? (
		<i>(Blank)</i>
	) : (
		pct.toFixed(1) + "%"
	);
}

function AttendanceInfo({
	attendance,
	updateAttendance,
}: {
	attendance: MultipleSessionAttendanceSummary;
	savedAttendance: MultipleSessionAttendanceSummary;
	updateAttendance: (changes: SessionAttendanceSummaryChanges) => void;
}) {
	return (
		<>
			<Row>
				<Field label="Registration:">
					<div style={{ display: "flex", alignItems: "center" }}>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								marginRight: 20,
							}}
						>
							<Checkbox
								id="isregistered"
								checked={!!attendance.IsRegistered}
								indeterminate={isMultiple(
									attendance.IsRegistered
								)}
								onChange={(e) =>
									updateAttendance({
										IsRegistered: e.target.checked,
									})
								}
							/>
							<label htmlFor="isregistered">Registered</label>
						</div>
						<div
							style={{
								display: "flex",
								alignItems: "center",
							}}
						>
							<Checkbox
								id="inperson"
								checked={!!attendance.InPerson}
								indeterminate={isMultiple(attendance.InPerson)}
								onChange={(e) =>
									updateAttendance({
										InPerson: e.target.checked,
									})
								}
							/>
							<label htmlFor="inperson">In-person</label>
						</div>
					</div>
				</Field>
			</Row>
			<Row>
				<Field label="IMAT recorded attendance:">
					{renderAttendancePercentage(
						attendance.AttendancePercentage
					)}
				</Field>
			</Row>
			<Row>
				<Field label="Attendance override:">
					<div style={{ display: "flex", alignItems: "center" }}>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								marginRight: 20,
							}}
						>
							<Checkbox
								id="didattend"
								checked={!!attendance.DidAttend}
								indeterminate={isMultiple(attendance.DidAttend)}
								onChange={(e) =>
									updateAttendance({
										DidAttend: e.target.checked,
									})
								}
							/>
							<label htmlFor="didattend">Did attend</label>
						</div>
						<div style={{ display: "flex", alignItems: "center" }}>
							<Checkbox
								id="didnotattend"
								checked={!!attendance.DidNotAttend}
								indeterminate={isMultiple(
									attendance.DidNotAttend
								)}
								onChange={(e) =>
									updateAttendance({
										DidNotAttend: e.target.checked,
									})
								}
							/>
							<label htmlFor="didnotattend">Did not attend</label>
						</div>
					</div>
				</Field>
			</Row>
		</>
	);
}

export function MemberEntryForm({
	action,
	sapins,
	member,
	saved,
	updateMember,
	attendance,
	savedAttendance,
	updateAttendance,
	add,
	update,
	cancel,
	readOnly,
	basicOnly,
}: {
	add: () => void;
	update: () => void;
	cancel: () => void;
	action: EditAction;
	sapins: number[];
	member: MultipleMember;
	saved?: MultipleMember;
	updateMember: (changes: Partial<Member>) => void;
	attendance: MultipleSessionAttendanceSummary;
	savedAttendance: MultipleSessionAttendanceSummary;
	updateAttendance: (changes: SessionAttendanceSummaryChanges) => void;
	readOnly?: boolean;
	basicOnly?: boolean;
}) {
	let errMsg = "";
	if (!member.SAPIN) errMsg = "SA PIN not set";
	else if (!member.Name) errMsg = "Name not set";
	else if (!member.LastName) errMsg = "Family name not set";
	else if (!member.FirstName) errMsg = "Given name not set";
	else if (!new RegExp(emailPattern).test(member.Email))
		errMsg = "Invalid email address";

	let submitForm, cancelForm, submitLabel;
	if (action === "add") {
		submitLabel = "Add";
		submitForm = async () => {
			if (errMsg) {
				ConfirmModal.show("Fix error: " + errMsg, false);
				return;
			}
			add();
		};
		cancelForm = cancel;
	} else if (action === "update") {
		submitLabel = "Update";
		submitForm = async () => {
			if (errMsg) {
				ConfirmModal.show("Fix error: " + errMsg, false);
				return;
			}
			update();
		};
		cancelForm = cancel;
	}

	function changeMember(changes: Partial<Member>) {
		const name =
			member.FirstName +
			(member.MI ? ` ${member.MI} ` : " ") +
			member.LastName;
		if (
			("LastName" in changes ||
				"FirstName" in changes ||
				"MI" in changes) &&
			member.Name === name
		) {
			const LastName =
				"LastName" in changes ? changes.LastName : member.LastName;
			const MI = "MI" in changes ? changes.MI : member.MI;
			const FirstName =
				"FirstName" in changes ? changes.FirstName : member.FirstName;
			changes.Name = FirstName + (MI ? ` ${MI} ` : " ") + LastName;
		}
		updateMember(changes);
	}

	return (
		<Form
			className="main"
			submitLabel={submitLabel}
			submit={submitForm}
			cancel={cancelForm}
			errorText={errMsg}
		>
			<MemberBasicInfo
				sapins={action === "add" ? [member.SAPIN as number] : sapins}
				member={member}
				saved={saved}
				updateMember={changeMember}
				readOnly={readOnly}
				basicOnly={basicOnly}
			/>
			{action !== "add" && (
				<AttendanceInfo
					attendance={attendance}
					savedAttendance={savedAttendance}
					updateAttendance={updateAttendance}
				/>
			)}
			{sapins.length <= 1 && (
				<Row>
					<MemberDetailInfo
						sapin={sapins[0]}
						member={member}
						saved={saved}
						updateMember={updateMember}
						readOnly={readOnly}
						basicOnly={basicOnly || action === "add"}
					/>
				</Row>
			)}
		</Form>
	);
}

export function useAttendanceUpdate() {
	const dispatch = useAppDispatch();
	return async (
		edited: MultipleSessionAttendanceSummary,
		saved: MultipleSessionAttendanceSummary,
		attendances: SessionAttendanceSummary[]
	) => {
		const changes = shallowDiff(
			saved,
			edited
		) as SessionAttendanceSummaryChanges;
		const p: AppThunk[] = [];
		const updates: SessionAttendanceSummaryUpdate[] = [];
		const adds: SessionAttendanceSummaryCreate[] = [];
		const deletes: EntityId[] = [];
		if (Object.keys(changes).length > 0) {
			for (const a of attendances) {
				const entry = { ...a, ...changes };
				if (entry.id) {
					if (isNullAttendanceSummary(a)) deletes.push(entry.id);
					else updates.push({ id: entry.id, changes });
				} else {
					adds.push(a);
				}
			}
			if (adds.length > 0) p.push(addAttendanceSummaries(adds));
			if (updates.length > 0) p.push(updateAttendanceSummaries(updates));
			if (deletes.length > 0) p.push(deleteAttendanceSummaries(deletes));
		}
		await Promise.all(p.map(dispatch));
	};
}

type MultipleSessionAttendanceSummary = Multiple<SessionAttendanceSummary>;

type MemberAttendanceDetailState = {
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

function initStateForSession(session: Session) {
	const state = store.getState();

	const { loading, valid } = selectSessionAttendeesState(state);
	const selected = selectSessionAttendeesSelected(state);
	const attendeeEntities = selectSessionAttendeesEntities(state);
	const memberEntities = selectMemberEntities(state);
	const attendanceSummaryEntities = selectAttendanceSummaryEntitiesForSession(
		state,
		session.id
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
	} satisfies MemberAttendanceDetailState;
}

export function MemberAttendanceDetail() {
	const dispatch = useAppDispatch();
	const sessionNumber = Number(useParams().sessionNumber);
	const session = useAppSelector((state) =>
		selectSessionByNumber(state, sessionNumber)
	)!;

	const access = useAppSelector(selectUserMembersAccess);
	const readOnly = access < AccessLevel.rw;

	const { loading, valid } = useAppSelector(selectSessionAttendeesState);
	const selected = useAppSelector(selectSessionAttendeesSelected);

	const initState = React.useCallback(
		() => initStateForSession(session),
		[session]
	);

	const [state, setState] =
		React.useState<MemberAttendanceDetailState>(initState);

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
	}, [state, selected, loading, valid, setState, initState, dispatch]);

	const changeMember = (changes: Partial<Member>) => {
		if (
			readOnly ||
			state.editedMember === null ||
			state.savedMember === null
		) {
			console.warn("Update with unexpected state");
			return;
		}
		setState((state) => {
			const { savedMember, editedAttendance, savedAttendance } = state;
			let { action, editedMember } = state;
			editedMember = { ...editedMember!, ...changes };
			if (isEqual(editedMember, savedMember)) {
				if (action !== "add" && editedAttendance === savedAttendance)
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

	const changeAttendance = (changes: SessionAttendanceSummaryChanges) => {
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
			} satisfies MemberAttendanceDetailState;
		});
	};

	const membersAdd = useMembersAdd();

	const add = async () => {
		const { action, editedMember, savedMember, members } = state;
		if (action !== "add" || editedMember === null || savedMember === null) {
			console.warn("Add with unexpected state");
			return;
		}
		const ids = await membersAdd(editedMember, savedMember, members);
		dispatch(setSelected(ids));
		setState(initState);
	};

	const membersUpdate = useMembersUpdate();
	const attendanceUpdate = useAttendanceUpdate();

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
		await attendanceUpdate(editedAttendance, savedAttendance, attendances);
		setState(initState);
	};

	const cancel = () => {
		setState(initState);
	};

	let title: string;
	if (state.action === "add") {
		title = "Add member" + (state.members.length > 1 ? "s" : "");
	} else if (state.action === "update") {
		title = "Update member" + (state.members.length > 1 ? "s" : "");
	} else {
		title = "Member detail";
	}

	return (
		<>
			<div className="top-row">
				<h3 style={{ color: "#0099cc", margin: 0 }}>{title}</h3>
			</div>
			{state.action === "view" && state.message ? (
				<div className="placeholder">
					<span>{state.message}</span>
				</div>
			) : (
				<MemberEntryForm
					action={state.action}
					sapins={state.members.map((m) => m.SAPIN)}
					member={state.editedMember!}
					saved={
						state.action !== "add" ? state.savedMember! : undefined
					}
					updateMember={changeMember}
					attendance={state.editedAttendance!}
					savedAttendance={state.savedAttendance!}
					updateAttendance={changeAttendance}
					add={add}
					update={update}
					cancel={cancel}
					readOnly={readOnly}
					basicOnly
				/>
			)}
			<ShowAccess access={access} />
		</>
	);
}

export default MemberAttendanceDetail;
