import React from "react";
import isEqual from "lodash.isequal";

import { ConfirmModal, deepMergeTagMultiple } from "@common";

import { useAppSelector } from "@/store/hooks";
import {
	memberContactInfoEmpty,
	selectMembersState,
	type Member,
	type MemberCreate,
	type MemberChange,
	type ContactInfo,
} from "@/store/members";

import {
	useMembersAddOne,
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

export type MembersEditState = (
	| {
			action: "add";
			edited: MemberCreate;
			saved: undefined;
	  }
	| {
			action: "update";
			edited: MultipleMember;
			saved: MultipleMember;
	  }
	| {
			action: null;
			message: string;
	  }
) & {
	originals: MemberCreate[];
};

function useInitState(selected: number[]) {
	const { entities, loading, valid } = useAppSelector(selectMembersState);
	return React.useCallback((): MembersEditState => {
		if (loading && !valid) {
			return {
				action: null,
				message: "Loading...",
				originals: [],
			} satisfies MembersEditState;
		}
		let edited = {} as MultipleMember;
		const originals: MemberCreate[] = [];
		for (const sapin of selected) {
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
			return {
				action: null,
				message: "Nothing selected",
				originals: [],
			} satisfies MembersEditState;
		}
		return {
			action: "update",
			edited,
			saved: edited,
			originals,
		} satisfies MembersEditState;
	}, [loading, valid, selected, entities]);
}

export function useMembersEdit({
	selected,
	setSelected,
	readOnly,
}: {
	selected: number[];
	setSelected: (ids: number[]) => void;
	readOnly?: boolean;
}) {
	const initState = useInitState(selected); // Callback to initialize state
	const [state, setState] = React.useState<MembersEditState>(initState);

	React.useEffect(() => {
		const { action, originals } = state;
		const ids = originals.map((m) => m.SAPIN);
		if (
			action === "update" &&
			state.edited === state.saved &&
			isEqual(selected, ids)
		) {
			setState(initState);
		} else if (
			(action === "update" && isEqual(selected, ids)) ||
			(action === "add" && selected.length > 0)
		) {
			ConfirmModal.show(
				"Changes not applied! Do you want to discard changes?"
			).then((ok) => {
				if (ok) setState(initState);
				else setSelected(ids);
			});
		}
	}, [selected]);

	const membersAdd = useMembersAddOne();
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
				if (isEqual(edited, state.saved)) edited = state.saved;
				return { ...state, edited };
			}),
		[readOnly, setState]
	);

	const hasChanges = React.useCallback(
		() =>
			state.action === "add" ||
			(state.action === "update" && state.edited !== state.saved),
		[state]
	);

	const onAdd = React.useCallback(async () => {
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
			saved: undefined,
			originals: [entry],
		});
	}, [setState, setSelected, state]);

	const onDelete = React.useCallback(async () => {
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
					message: "Nothing selected...",
					originals: [],
				});
				await membersDelete(originals);
			}
		}
	}, [setState, setSelected, membersDelete, state]);

	const submit = React.useCallback(async () => {
		if (readOnly || state.action === null) {
			console.warn("submit: bad state");
			return;
		}
		if (state.action === "add") {
			const { edited } = state;
			setState({
				action: null,
				message: "Adding...",
				originals: [],
			});
			const ids = await membersAdd(edited);
			setSelected(ids);
		} else if (state.action === "update") {
			const { edited, saved, originals } = state;
			setSelected([]);
			setState({
				action: null,
				message: "Updating...",
				originals: [],
			});
			await membersUpdate(edited, saved, originals);
			setSelected(originals.map((m) => m.SAPIN));
		}
	}, [state]);

	const cancel = React.useCallback(() => {
		setState(initState);
	}, [initState]);

	return {
		state,
		hasChanges,
		submit,
		cancel,
		onChange,
		onAdd,
		onDelete,
	};
}
