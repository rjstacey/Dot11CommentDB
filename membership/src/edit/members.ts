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
} from "./memberActions";

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

export type EditAction = "add" | "update" | null;

export type MemberEditState = (
	| {
			action: "add";
			edited: MemberCreate;
			saved: null;
	  }
	| {
			action: "update";
			edited: MultipleMember;
			saved: MultipleMember;
	  }
	| {
			action: null;
			edited: null;
			saved: null;
	  }
) & {
	originals: MemberCreate[];
	message: string;
};

function useInitState(selected: EntityId[]) {
	const { entities, loading, valid } = useAppSelector(selectMembersState);
	return React.useCallback((): MemberEditState => {
		const state: MemberEditState = {
			action: null,
			edited: null,
			saved: null,
			originals: [],
			message: "",
		};
		if (loading && !valid) {
			state.message = "Loading...";
			return state;
		}
		let edited = {} as MultipleMember;
		const originals: MemberCreate[] = [];
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
			state.message = "Nothing selected";
			return state;
		}
		return {
			action: "update",
			edited,
			saved: edited,
			originals,
			message: "",
		} satisfies MemberEditState;
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
		const { action, edited, saved, originals } = state;
		const ids = originals.map((m) => m.SAPIN);
		if (
			action === "update" &&
			edited === saved &&
			selected.join() !== ids.join()
		) {
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

	const onChange = React.useCallback(
		(changes: MemberChange) =>
			setState((state) => {
				if (
					readOnly ||
					state.action === null ||
					state.edited === null
				) {
					console.warn("Update in bad state");
					return state;
				}
				if (state.action === "add") {
					const edited = { ...state.edited, ...changes };
					return { ...state, edited };
				}
				let edited = { ...state.edited, ...changes };
				if (shallowEqual(edited, state.saved)) edited = state.saved;
				return { ...state, edited };
			}),
		[setState, readOnly]
	);

	const hasChanges = React.useCallback(
		() => state.action === "add" || state.edited !== state.saved,
		[state]
	);

	const clickAdd = React.useCallback(async () => {
		if (state.action === "update" && state.edited !== state.saved) {
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
			saved: null,
			originals: [entry],
			message: "",
		});
	}, [setState, setSelected, state.action]);

	const clickDelete = React.useCallback(async () => {
		const { originals } = state;
		if (originals.length > 0) {
			const str =
				"Are you sure you want to delete:\n" +
				originals.map((o) => `${o.SAPIN} ${o.Name}`).join("\n");
			const ok = await ConfirmModal.show(str);
			if (ok) {
				setSelected([]);
				setState({
					action: null,
					edited: null,
					saved: null,
					originals: [],
					message: "Nothing selected...",
				});
				await membersDelete(originals);
			}
		}
	}, [setState, setSelected, membersDelete, state]);

	const add = React.useCallback(async () => {
		const { edited, saved, originals } = state;
		if (edited === null || saved === null) {
			console.warn("Add with unexpected state");
			return;
		}
		setState({
			action: null,
			edited: null,
			saved: null,
			originals: [],
			message: "Adding...",
		});
		const ids = await membersAdd(edited, saved, originals);
		setSelected(ids);
	}, [setSelected, membersAdd, state]);

	const update = React.useCallback(async () => {
		const { action, edited, saved, originals } = state;
		if (action !== "update" || edited === null || saved === null) {
			console.warn("Update with unexpected state");
			return;
		}
		setSelected([]);
		setState({
			action: null,
			saved: null,
			edited: null,
			originals: [],
			message: "Updating...",
		});
		await membersUpdate(edited, saved, originals);
		setSelected(originals.map((m) => m.SAPIN));
	}, [setSelected, membersUpdate, state]);

	const submit = React.useCallback(async () => {
		if (state.action === "add") return add();
		else if (state.action === "update") return update();
	}, [state, add, update]);

	const cancel = React.useCallback(() => {
		setState(initState);
	}, [initState]);

	return {
		state,
		hasChanges,
		submit,
		cancel,
		onChange,
		clickAdd,
		clickDelete,
	};
}
