import { useCallback, useEffect, useReducer } from "react";
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

export type MembersEditState = (
	| {
			action: null;
			message: string;
	  }
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
) & {
	originals: MemberCreate[];
};

type MembersEditAction =
	| {
			type: "INIT";
	  }
	| {
			type: "CREATE";
	  }
	| {
			type: "CHANGE";
			changes: MemberChange;
	  }
	| {
			type: "SUBMIT";
	  };
const INIT = { type: "INIT" } as const;
const CREATE = { type: "CREATE" } as const;
const SUBMIT = { type: "SUBMIT" } as const;
const CHANGE = (changes: MemberChange) =>
	({ type: "CHANGE", changes }) as const;

function useMembersEditReducer(selected: number[]) {
	const { entities, loading, valid } = useAppSelector(selectMembersState);

	const init = useCallback((): MembersEditState => {
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
				member,
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
	}, [selected, loading, valid, entities]);

	const reducer = useCallback(
		(
			state: MembersEditState,
			action: MembersEditAction,
		): MembersEditState => {
			if (action.type === "INIT") {
				return init();
			}
			if (action.type === "CREATE") {
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
				return {
					action: "add",
					edited: entry,
					saved: undefined,
					originals: [entry],
				};
			}
			if (action.type === "CHANGE") {
				if (state.action === "add") {
					return {
						...state,
						edited: { ...state.edited, ...action.changes },
					};
				} else if (state.action === "update") {
					let edited = { ...state.edited, ...action.changes };
					if (isEqual(edited, state.saved)) edited = state.saved;
					return {
						...state,
						edited,
					};
				}
				return state;
			}
			if (action.type === "SUBMIT") {
				if (state.action === "add") {
					return {
						...state,
						action: null,
						message: "Adding...",
					};
				} else if (state.action === "update") {
					return {
						...state,
						saved: state.edited,
					};
				}
				return state;
			}
			console.error("Unknown action:", action);
			return state;
		},
		[],
	);

	return useReducer(reducer, undefined, init);
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
	const [state, dispatchStateAction] = useMembersEditReducer(selected);

	useEffect(() => {
		const { action, originals } = state;
		if (action === null) {
			dispatchStateAction(INIT);
		} else if (action === "add") {
			if (selected.length > 0) {
				ConfirmModal.show(
					"Changes not applied! Do you want to discard changes?",
				).then((ok) => {
					if (ok) dispatchStateAction(INIT);
					else setSelected([]);
				});
			}
		} else if (action === "update") {
			if (state.edited === state.saved) {
				dispatchStateAction(INIT);
				return;
			}
			const ids = originals.map((m) => m.SAPIN);
			if (!isEqual(selected, ids)) {
				ConfirmModal.show(
					"Changes not applied! Do you want to discard changes?",
				).then((ok) => {
					if (ok) dispatchStateAction(INIT);
					else setSelected(ids);
				});
			}
		}
	}, [selected]);

	const membersAdd = useMembersAdd();
	const membersUpdate = useMembersUpdate();
	const membersDelete = useMembersDelete();

	const onChange = useCallback(
		(changes: MemberChange) => {
			if (readOnly || state.action === null) {
				console.warn("onChange: bad state");
				return;
			}
			dispatchStateAction(CHANGE(changes));
		},
		[readOnly, state.action],
	);

	const hasChanges = useCallback(
		() =>
			state.action === "add" ||
			(state.action === "update" && state.edited !== state.saved),
		[state],
	);

	const disableAdd = readOnly;
	const onAdd = useCallback(async () => {
		if (state.action === "update" && state.edited !== state.saved) {
			const ok = await ConfirmModal.show(
				`Changes not applied! Do you want to discard changes?`,
			);
			if (!ok) return;
		}
		setSelected([]);
		dispatchStateAction(CREATE);
	}, [state, setSelected]);

	const disableDelete = readOnly || state.originals.length === 0;
	const onDelete = useCallback(async () => {
		const { originals } = state;
		if (originals.length > 0) {
			const str =
				"Are you sure you want to delete:\n" +
				originals.map((o) => `${o.SAPIN} ${o.Name}`).join("\n");
			const ok = await ConfirmModal.show(str);
			if (ok) {
				await membersDelete(originals);
				setSelected([]);
				dispatchStateAction(INIT);
			}
		}
	}, [state, membersDelete, setSelected]);

	const submit = useCallback(async () => {
		if (readOnly || state.action === null) {
			console.warn("submit: bad state");
			return;
		}
		if (state.action === "add") {
			const { edited } = state;
			const ids = await membersAdd(edited);
			setSelected(ids);
		} else if (state.action === "update") {
			const { edited, saved, originals } = state;
			await membersUpdate(edited, saved, originals);
		}
		dispatchStateAction(SUBMIT);
	}, [readOnly, state, membersAdd, membersUpdate, setSelected]);

	const cancel = useCallback(() => {
		dispatchStateAction(INIT);
	}, [dispatchStateAction]);

	return {
		state,
		hasChanges,
		submit,
		cancel,
		onChange,
		onAdd,
		disableAdd,
		onDelete,
		disableDelete,
	};
}
