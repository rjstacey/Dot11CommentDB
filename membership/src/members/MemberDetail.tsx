import React from "react";
import { shallowEqual } from "react-redux";
import type { EntityId } from "@reduxjs/toolkit";

import {
	ActionButton,
	ConfirmModal,
	deepMergeTagMultiple,
} from "dot11-components";

import { useAppSelector } from "../store/hooks";
import { AccessLevel } from "../store/user";
import {
	memberContactInfoEmpty,
	selectMembersState,
	selectUserMembersAccess,
	type Member,
	type MemberAdd,
} from "../store/members";

import {
	MemberEntryForm,
	useMembersAdd,
	useMembersUpdate,
	useMembersDelete,
	type MultipleMember,
	type EditAction,
} from "./MemberEdit";
import ShowAccess from "../components/ShowAccess";

const defaultMember = {
	SAPIN: 0,
	Name: "",
	FirstName: "",
	LastName: "",
	MI: "",
	Email: "",
	Status: "Non-Voter",
	Affiliation: "",
	Employer: "",
	Access: 0,
	ContactInfo: memberContactInfoEmpty,
};

type MemberDetailState = {
	action: EditAction;
	edited: MultipleMember | null;
	saved: MultipleMember | null;
	originals: MemberAdd[];
	message: string;
};

function MemberDetail({
	selected,
	setSelected,
}: {
	selected: EntityId[];
	setSelected: (ids: EntityId[]) => void;
}) {
	const access = useAppSelector(selectUserMembersAccess);
	const readOnly = access < AccessLevel.rw;

	let { entities, loading, valid } = useAppSelector(selectMembersState);

	const initState = React.useCallback((): MemberDetailState => {
		let action: EditAction = "view",
			edited: MultipleMember | null = null,
			originals: MemberAdd[] = [],
			message: string = "";

		if (loading && !valid) {
			message = "Loading...";
		}
		if (selected.length === 0) {
			message = "Nothing selected";
		} else {
			for (const sapin of selected as number[]) {
				const member = entities[sapin];
				if (!member) {
					console.warn("Can't get member with SAPIN=" + sapin);
					continue;
				}
				edited = deepMergeTagMultiple(
					edited || {},
					member
				) as MultipleMember;
				originals.push(member);
			}
			if (originals.length === 0) {
				message = "Nothing selected";
			}
		}
		return {
			action,
			edited,
			saved: edited,
			originals,
			message,
		};
	}, [loading, valid, selected, entities]);

	const [state, setState] = React.useState<MemberDetailState>(initState);

	React.useEffect(() => {
		const { action, originals } = state;
		const ids = originals.map((m) => m.SAPIN);
		if (action === "view" && selected.join() !== ids.join()) {
			setState(initState);
		} else if (action === "update" && selected.join() !== ids.join()) {
			ConfirmModal.show(
				"Changes not applied! Do you want to discard changes?"
			).then((ok) => {
				if (ok) setState(initState);
				else setSelected(ids);
			});
		} else if (action === "add" && selected.length > 0) {
			ConfirmModal.show(
				"Changes not applied! Do you want to discard changes?"
			).then((ok) => {
				if (ok) setState(initState);
				else setSelected([]);
			});
		}
	}, [state, selected, setSelected, initState]);

	const updateMember = (changes: Partial<Member>) => {
		if (readOnly || state.edited === null || state.saved === null) {
			console.warn("Update in bad state");
			return;
		}
		setState((state) => {
			let { action, edited, saved } = state;
			edited = { ...edited!, ...changes };
			if (shallowEqual(edited, saved!)) {
				if (action !== "add") action = "view";
				edited = saved!;
			} else {
				if (action !== "add") action = "update";
			}
			return {
				...state,
				action,
				edited,
				saved,
			};
		});
	};

	const clickAdd = async () => {
		if (state.action === "update") {
			const ok = await ConfirmModal.show(
				`Changes not applied! Do you want to discard changes?`
			);
			if (!ok) return;
		}

		const entry: MemberAdd & {
			StatusChangeHistory: Member["StatusChangeHistory"];
			ContactEmails: Member["ContactEmails"];
			ContactInfo: Member["ContactInfo"];
		} = {
			...defaultMember,
			StatusChangeHistory: [],
			ContactEmails: [],
		};
		setSelected([]);
		setState({
			action: "add",
			edited: entry,
			saved: entry,
			originals: [entry],
			message: "",
		});
	};

	const membersDelete = useMembersDelete();

	const clickDelete = async () => {
		const { originals } = state;
		if (originals.length > 0) {
			const str =
				"Are you sure you want to delete:\n" +
				originals.map((o) => `${o.SAPIN} ${o.Name}`).join("\n");
			const ok = await ConfirmModal.show(str);
			if (ok) {
				await membersDelete(originals);
				setSelected([]);
				setState(initState);
			}
		}
	};

	const membersAdd = useMembersAdd();

	const add = async () => {
		const { action, edited, saved, originals } = state;
		if (action !== "add" || edited === null || saved === null) {
			console.warn("Add with unexpected state");
			return;
		}
		const ids = await membersAdd(edited, saved, originals);
		setSelected(ids);
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
		//setState(initState);
		setState((state) => ({
			...state,
			action: "view",
			saved: null, //edited,
			edited: null,
			originals: [],
			message: "Updating...",
		}));
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
				<div>
					{!readOnly && (
						<>
							<ActionButton
								name="add"
								title="Add member"
								disabled={loading || readOnly}
								isActive={state.action === "add"}
								onClick={clickAdd}
							/>
							<ActionButton
								name="delete"
								title="Delete member"
								disabled={
									loading ||
									state.originals.length === 0 ||
									readOnly
								}
								onClick={clickDelete}
							/>
						</>
					)}
				</div>
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
					saved={state.saved!}
					updateMember={updateMember}
					add={add}
					update={update}
					cancel={cancel}
					readOnly={readOnly}
					basicOnly={state.originals.length > 1}
				/>
			)}
			<ShowAccess access={access} />
		</>
	);
}

export default MemberDetail;
