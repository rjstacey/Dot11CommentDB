import * as React from "react";
import { shallowEqual } from "react-redux";

import {
	ConfirmModal,
	shallowDiff,
	deepMergeTagMultiple,
} from "dot11-components";

import { useAppSelector, useAppDispatch } from "../store/hooks";
import { AccessLevel } from "../store/user";
import {
	selectMemberEntities,
	selectUserMembersAccess,
	type Member,
	type MemberAdd,
	MemberContactEmail,
} from "../store/members";
import {
	setSelected,
	selectSessionAttendeesState,
	SessionAttendee,
} from "../store/sessionAttendees";

import {
	MemberEntryForm,
	useMembersAdd,
	useMembersUpdate,
	type MultipleMember,
	type EditAction,
} from "../members/MemberEdit";
import ShowAccess from "../components/ShowAccess";

function sessionAttendeeToMember(attendee: SessionAttendee) {
	const member: MemberAdd = {
		SAPIN: attendee.SAPIN,
		Name: attendee.Name,
		FirstName: attendee.FirstName,
		LastName: attendee.LastName,
		MI: attendee.MI,
		Employer: attendee.Employer || "",
		Email: attendee.Email,
		Affiliation: attendee.Affiliation,
		Status: "Non-Voter",
		Access: 0,
		ContactInfo: attendee.ContactInfo,
	};
	return member;
}

type MemberAttendanceDetailState = {
	action: EditAction;
	edited: MultipleMember | null;
	created: MultipleMember | null;
	saved: MultipleMember | null;
	originals: MemberAdd[];
	message: string;
};

export function MemberAttendanceDetail() {
	const dispatch = useAppDispatch();

	const access = useAppSelector(selectUserMembersAccess);
	const readOnly = access < AccessLevel.rw;

	const memberEntities = useAppSelector(selectMemberEntities);
	const { loading, valid, selected, entities, useDaily } = useAppSelector(
		selectSessionAttendeesState
	);

	const initState = React.useCallback((): MemberAttendanceDetailState => {
		let action: EditAction = "view",
			edited: MultipleMember | null = null,
			saved: MultipleMember | null = null,
			originals: MemberAdd[] = [],
			message: string = "";

		if (loading && !valid) {
			message = "Loading...";
		} else if (selected.length === 0) {
			message = "Nothing selected";
		} else if (selected.every((id) => memberEntities[id])) {
			// All selected are existing members
			action = "update";
			for (const sapin of selected as number[]) {
				const member = memberEntities[sapin]!;
				const attendee = entities[sapin];
				if (!attendee) {
					console.warn("Can't get member with SAPIN=" + sapin);
					continue;
				}
				const { Status, Access, SAPIN, ...attendeeAsMember } =
					sessionAttendeeToMember(attendee);
				if (!useDaily) attendeeAsMember.Employer = member.Employer;
				const changes = shallowDiff(
					member,
					attendeeAsMember
				) as Partial<Member>;
				edited = deepMergeTagMultiple(edited || {}, {
					...member,
					...changes,
				}) as MultipleMember;
				saved = deepMergeTagMultiple(
					saved || {},
					member
				) as MultipleMember;
				originals.push(member);
			}
			if (shallowEqual(edited, saved)) {
				action = "view";
				saved = edited;
			}
		} else if (selected.every((id) => !memberEntities[id])) {
			// All selected are new attendees
			action = "add";
			for (const sapin of selected as number[]) {
				const attendee = entities[sapin];
				if (!attendee) {
					console.warn("Can't get member with SAPIN=" + sapin);
					continue;
				}
				const { Status, Access, SAPIN, ...attendeeAsMember } =
					sessionAttendeeToMember(attendee);
				const date = new Date().toISOString();
				const contactEmail: MemberContactEmail = {
					id: 0,
					Email: attendeeAsMember.Email,
					Primary: 1,
					Broken: 0,
					DateAdded: date,
				};
				const newMember: MemberAdd = {
					...attendeeAsMember,
					DateAdded: date,
					ContactEmails: [contactEmail],
					Status: "Non-Voter",
					SAPIN: 0,
					Access: 0,
				};
				edited = deepMergeTagMultiple(
					edited || {},
					newMember as MultipleMember
				) as MultipleMember;
				originals.push(newMember);
			}
			saved = edited;
		} else {
			message = "Mix of new attendees and existing members selected";
		}

		return {
			action,
			edited,
			created: edited,
			saved,
			originals,
			message,
		};
	}, [loading, valid, selected, entities, useDaily, memberEntities]);

	const [state, setState] =
		React.useState<MemberAttendanceDetailState>(initState);

	React.useEffect(() => {
		const { action, edited, created, originals } = state;
		const ids = originals.map((m) => m.SAPIN);
		if (action === "view" && selected.join() !== ids.join()) {
			setState(initState);
		} else if (action === "update" && selected.join() !== ids.join()) {
			if (edited === created) {
				// Nothing was changed
				setState(initState);
				return;
			}
			ConfirmModal.show(
				"Changes not applied! Do you want to discard changes?"
			).then((ok) => {
				if (ok) setState(initState);
				else dispatch(setSelected(ids)); // Revert to previously selected
			});
		} else if (action === "add" && selected.length > 0) {
			ConfirmModal.show(
				"Changes not applied! Do you want to discard changes?"
			).then((ok) => {
				if (ok) setState(initState);
				else dispatch(setSelected([])); // Undo selected
			});
		}
	}, [state, selected, setState, initState, dispatch]);

	const updateMember = (changes: Partial<Member>) => {
		if (readOnly || state.edited === null || state.saved === null) {
			console.warn("Update with unexpected state");
			return;
		}
		setState(state => {
			let { action, edited, saved } = state;
			edited = { ...edited!, ...changes };
			if (shallowEqual(edited, saved!)) {
				if (action !== "add") action = "view";
				edited = saved!;
			}
			else {
				if (action !== "add") action = "update";
			}
			return {
				...state,
				action,
				edited,
				saved
			}
		});
	};

	const membersAdd = useMembersAdd();

	const add = async () => {
		const { action, edited, saved, originals } = state;
		if (action !== "add" || edited === null || saved === null) {
			console.warn("Add with unexpected state");
			return;
		}
		const ids = await membersAdd(edited, saved, originals);
		dispatch(setSelected(ids));
		setState(initState);
	};

	const membersUpdate = useMembersUpdate();

	const update = async () => {
		const { action, edited, saved, originals } = state;
		if (action !== "update" || edited === null || saved === null) {
			console.warn("Update with unexpected state");
			return;
		}
		await membersUpdate(edited, saved, originals);
		setState(initState);
	};

	const cancel = () => {
		setState(initState);
	};

	let title: string;
	if (state.action === "add") {
		title = "Add member" + (state.originals.length > 1 ? "s" : "");
	} else if (state.action === "update") {
		title = "Update member" + (state.originals.length > 1 ? "s" : "");
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
					sapins={state.originals.map((m) => m.SAPIN)}
					member={state.edited!}
					updateMember={updateMember}
					add={add}
					update={update}
					cancel={cancel}
					readOnly={readOnly}
				/>
			)}
			<ShowAccess access={access} />
		</>
	);
}

export default MemberAttendanceDetail;
