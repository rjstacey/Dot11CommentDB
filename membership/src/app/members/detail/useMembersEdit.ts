import * as React from "react";
import { shallowEqual } from "react-redux";
import type { EntityId } from "@reduxjs/toolkit";

import { ConfirmModal, deepMergeTagMultiple } from "@common";

import { useAppSelector } from "@/store/hooks";
import {
	ContactInfo,
	memberContactInfoEmpty,
	selectMembersState,
	type Member,
	type MemberCreate,
	type MemberChange,
} from "@/store/members";

import {
	useMembersAdd,
	useMembersUpdate,
	useMembersDelete,
	type MultipleMember,
} from "./useMemberActions";

export type { MultipleMember };

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

export type EditAction = "view" | "update" | "add";

export type MemberEditState = {
	action: EditAction;
	edited: MultipleMember | null;
	saved: MultipleMember | null;
	originals: MemberCreate[];
	message: string;
};

function useInitState(selected: EntityId[]) {
	const { entities, loading, valid } = useAppSelector(selectMembersState);
	return React.useCallback((): MemberEditState => {
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

export function useMemberEdit({
	selected,
	setSelected,
	readOnly,
}: {
	selected: EntityId[];
	setSelected: (ids: EntityId[]) => void;
	readOnly?: boolean;
}) {
	const initState = useInitState(selected); // Callback to initialize state
	const [state, setState] = React.useState<MemberEditState>(initState);

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

	const membersAdd = useMembersAdd();
	const membersUpdate = useMembersUpdate();
	const membersDelete = useMembersDelete();

	const actions = React.useMemo(() => {
		const onChange = (changes: MemberChange) => {
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

		const hasChanges = () => state.edited !== state.saved;

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

		const add = async () => {
			const { edited, saved, originals } = state;
			if (edited === null || saved === null) {
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

		const submit = async () => {
			if (state.action === "add") return add();
			else if (state.action === "update") return update();
		};

		const cancel = () => {
			setState(initState);
		};

		return {
			hasChanges,
			submit,
			cancel,
			onChange,
			clickAdd,
			clickDelete,
		};
	}, [
		state,
		readOnly,
		setSelected,
		membersDelete,
		membersAdd,
		membersUpdate,
		initState,
	]);

	return {
		state,
		...actions,
	};
}
