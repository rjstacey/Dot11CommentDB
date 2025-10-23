import * as React from "react";
import { Button } from "react-bootstrap";
import { shallowEqual } from "react-redux";
import type { EntityId } from "@reduxjs/toolkit";

import { ConfirmModal } from "@common";
import { deepMergeTagMultiple } from "@common";

import { useAppSelector } from "@/store/hooks";
import { AccessLevel } from "@common";
import {
	ContactInfo,
	memberContactInfoEmpty,
	selectMembersState,
	selectUserMembersAccess,
	type Member,
	type MemberCreate,
} from "@/store/members";

import ShowAccess from "@/components/ShowAccess";
import {
	MemberEntryForm,
	type MultipleMember,
	type EditAction,
} from "./MemberEdit";
import {
	useMembersAdd,
	useMembersUpdate,
	useMembersDelete,
} from "./useMembersEdit";

const defaultMember: MemberCreate & { ContactInfo: ContactInfo } = {
	SAPIN: 0,
	Name: "",
	FirstName: "",
	LastName: "",
	MI: "",
	Email: "",
	Status: "Non-Voter",
	Affiliation: "",
	Employer: "",
	ContactInfo: memberContactInfoEmpty,
	StatusChangeOverride: false,
};

type MemberDetailState = {
	action: EditAction;
	edited: MultipleMember | null;
	saved: MultipleMember | null;
	originals: MemberCreate[];
	message: string;
};

function useInitState(selected: EntityId[]) {
	const { entities, loading, valid } = useAppSelector(selectMembersState);
	return React.useCallback((): MemberDetailState => {
		const action: EditAction = "view",
			originals: MemberCreate[] = [];
		let edited: MultipleMember | null = null,
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
}

export function MemberDetail({
	selected,
	setSelected,
}: {
	selected: EntityId[];
	setSelected: (ids: EntityId[]) => void;
}) {
	const access = useAppSelector(selectUserMembersAccess);
	const readOnly = access < AccessLevel.rw;

	const initState = useInitState(selected); // Callback to initialize state

	const [state, setState] = React.useState<MemberDetailState>(initState);

	React.useEffect(() => {
		const { action, originals } = state;
		const ids = originals.map((m) => m.SAPIN);
		if (action === "view" && selected.join() !== ids.join()) {
			setState(initState);
		} else if (
			(action === "update" && selected.join() !== ids.join()) ||
			(action === "add" && selected.length > 0)
		) {
			ConfirmModal.show(
				"Changes not applied! Do you want to discard changes?"
			).then((ok) => {
				if (ok) setState(initState);
				else setSelected(ids);
			});
		}
	}, [state, selected, setSelected, initState]);

	const updateMember = (changes: Partial<Member>) => {
		if (readOnly || state.edited === null || state.saved === null) {
			console.warn("Update in bad state");
			return;
		}
		setState((state) => {
			let { action, edited } = state;
			const { saved } = state;
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

		const entry: MemberCreate & {
			StatusChangeHistory: Member["StatusChangeHistory"];
			ContactEmails: Member["ContactEmails"];
			ContactInfo: Member["ContactInfo"];
			ReplacedBySAPIN: Member["ReplacedBySAPIN"];
			ObsoleteSAPINs: Member["ObsoleteSAPINs"];
		} = {
			...defaultMember,
			StatusChangeHistory: [],
			ContactEmails: [],
			ReplacedBySAPIN: null,
			ObsoleteSAPINs: [],
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
				setSelected([]);
				setState({
					action: "view",
					edited: null,
					saved: null,
					originals: [],
					message: "Nothing selected...",
				});
				await membersDelete(originals);
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
		setState({
			action: "view",
			edited: null,
			saved: null,
			originals: [],
			message: "Adding...",
		});
		const ids = await membersAdd(edited, saved, originals);
		setSelected(ids);
	};

	const membersUpdate = useMembersUpdate();

	const update = async () => {
		const { action, edited, saved, originals } = state;
		if (action !== "update" || edited === null || saved === null) {
			console.warn("Update with unexpected state");
			return;
		}
		setSelected([]);
		setState({
			action: "view",
			saved: null,
			edited: null,
			originals: [],
			message: "Updating...",
		});
		await membersUpdate(edited, saved, originals);
		setSelected(selected);
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
			<div className="d-flex align-items-center justify-content-between">
				<h3 style={{ color: "#0099cc", margin: 0 }}>{title}</h3>
				{!readOnly && (
					<div className="d-flex gap-2">
						<Button
							variant="outline-primary"
							className="bi-plus-lg"
							title="Add member"
							disabled={readOnly}
							active={state.action === "add"}
							onClick={clickAdd}
						/>
						<Button
							variant="outline-danger"
							className="bi-trash"
							title="Delete member"
							disabled={
								(state.action === "view" &&
									Boolean(state.message)) ||
								readOnly
							}
							onClick={clickDelete}
						/>
					</div>
				)}
			</div>
			{state.action === "view" && state.message ? (
				<div className="details-panel-placeholder">
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
