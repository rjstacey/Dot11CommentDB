import { useCallback, useEffect, useReducer } from "react";
import isEqual from "lodash.isequal";

import { ConfirmModal, shallowDiff } from "@common";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectMembersSummary } from "@/store/members";
import {
	MembershipEvent,
	MembershipEventCreate,
	selectMembershipOverTimeState,
	setSelected,
	updateMembershipOverTime,
	addMembershipOverTime,
	deleteMembershipOverTime,
} from "@/store/membershipOverTime";

export type MembershipOverTimeEditState = (
	| {
			action: null;
			message: string;
	  }
	| {
			action: "add";
			edited: MembershipEventCreate;
			saved: undefined;
	  }
	| {
			action: "update";
			edited: MembershipEvent;
			saved: MembershipEvent;
	  }
) & { ids: number[] };

type MembershipOverTimeEditAction =
	| {
			type: "INIT";
	  }
	| {
			type: "CREATE";
	  }
	| {
			type: "CHANGE";
			changes: Partial<MembershipEvent>;
	  }
	| {
			type: "SUBMIT";
	  };
const INIT = { type: "INIT" } as const;
const CREATE = { type: "CREATE" } as const;
const SUBMIT = { type: "SUBMIT" } as const;
const CHANGE = (changes: Partial<MembershipEvent>) =>
	({ type: "CHANGE", changes }) as const;

function useMembershipOverTimeReducer() {
	const { entities, selected, loading, valid } = useAppSelector(
		selectMembershipOverTimeState,
	);
	const membersSummary = useAppSelector(selectMembersSummary);

	const initState = useCallback((): MembershipOverTimeEditState => {
		let message: string;
		if (loading && !valid) {
			message = "Loading...";
		} else if (selected.length > 1) {
			message = "Multiple selected";
		} else if (selected.length === 0) {
			message = "Nothing selected";
		} else {
			const id = selected[0];
			const entity = entities[id];
			if (entity) {
				return {
					action: "update",
					edited: entity,
					saved: entity,
					ids: selected as number[],
				};
			} else {
				message = "Selected entity not found";
			}
		}

		return {
			action: null,
			message,
			ids: selected as number[],
		};
	}, [loading, valid, selected, entities]);

	const reducer = useCallback(
		(
			state: MembershipOverTimeEditState,
			action: MembershipOverTimeEditAction,
		): MembershipOverTimeEditState => {
			if (action.type === "INIT") {
				return initState();
			}
			if (action.type === "CREATE") {
				const edited: MembershipEventCreate = {
					date: new Date().toISOString().slice(0, 10),
					count: membersSummary.Voter || 0,
					note: null,
				};
				return {
					action: "add",
					edited: edited,
					saved: undefined,
					ids: [],
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
		[initState, membersSummary],
	);

	return useReducer(reducer, undefined, initState);
}

export function useMembershipOverTimeEdit(readOnly: boolean) {
	const [state, dispatchStateAction] = useMembershipOverTimeReducer();

	const dispatch = useAppDispatch();
	const { selected } = useAppSelector(selectMembershipOverTimeState);

	/** If `selected` changes, then determine how to reevaluate state.
	 * Note that `selected` might change as a result of submit, etc. so becareful of race conditions. */
	useEffect(() => {
		if (state.action === null) {
			dispatchStateAction(INIT);
		} else if (state.action === "add") {
			if (selected.length > 0) {
				ConfirmModal.show(
					"Changes not applied! Do you want to discard changes?",
				).then((ok) => {
					if (ok) dispatchStateAction(INIT);
					else dispatch(setSelected([]));
				});
			}
		} else if (state.action === "update") {
			if (selected.length !== 1 || state.ids[0] !== selected[0]) {
				if (state.edited === state.saved) {
					dispatchStateAction(INIT);
					return;
				}
				ConfirmModal.show(
					"Changes not applied! Do you want to discard changes?",
				).then((ok) => {
					if (ok) dispatchStateAction(INIT);
					else dispatch(setSelected(state.ids));
				});
			}
		}
	}, [selected]);

	const onChange = useCallback(
		(changes: Partial<MembershipEvent>) => {
			if (readOnly || state.action === null) {
				console.warn("onChange: bad state");
				return;
			}
			dispatchStateAction(CHANGE(changes));
		},
		[readOnly, state.action],
	);

	const submit = useCallback(async () => {
		if (readOnly || state.action === null) {
			console.warn("submit: bad state");
			return;
		}
		if (state.action === "add") {
			const [event] = await dispatch(
				addMembershipOverTime([state.edited]),
			);
			if (!event) return;
			dispatch(setSelected([event.id]));
		} else if (state.action === "update") {
			const { edited, saved } = state;
			const update = {
				id: edited.id,
				changes: shallowDiff(saved, edited),
			};
			if (Object.keys(update.changes).length > 0)
				await dispatch(updateMembershipOverTime([update]));
		}
		dispatchStateAction(SUBMIT);
	}, [readOnly, state]);

	const cancel = useCallback(() => {
		dispatchStateAction(INIT);
	}, []);

	const hasChanges = useCallback(
		() =>
			state.action === "add" ||
			(state.action === "update" && state.edited !== state.saved),
		[state],
	);

	const disableAdd = readOnly;
	const onAdd = useCallback(async () => {
		if (disableAdd) {
			console.warn("onAdd: bad state");
			return;
		}
		if (hasChanges()) {
			const ok = await ConfirmModal.show(
				`Changes not applied! Do you want to discard changes?`,
			);
			if (!ok) return;
		}
		dispatchStateAction(CREATE);
		dispatch(setSelected([]));
	}, [disableAdd, hasChanges]);

	const disableDelete =
		readOnly || state.action === "add" || state.ids.length === 0;
	const onDelete = useCallback(async () => {
		if (disableDelete) {
			console.warn("onDelete: bad state");
			return;
		}
		const str = `Are you sure you want to delete ${state.ids.length} membership event${state.ids.length > 1 ? "s" : ""}?`;
		const ok = await ConfirmModal.show(str);
		if (ok) {
			await dispatch(deleteMembershipOverTime(state.ids));
			dispatchStateAction(SUBMIT);
			dispatch(setSelected([]));
		}
	}, [disableDelete, state.ids, dispatch]);

	return {
		state,
		hasChanges,
		onChange,
		submit,
		cancel,
		onAdd,
		disableAdd,
		onDelete,
		disableDelete,
	};
}
