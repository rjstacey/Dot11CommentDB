import { useState, useCallback, useEffect } from "react";
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

export function useMembershipOverTimeEdit(readOnly: boolean) {
	const dispatch = useAppDispatch();

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

	const [state, setState] = useState(initState);

	useEffect(() => {
		if (state.action === "add") {
			if (selected.length > 0) {
				ConfirmModal.show(
					"Changes not applied! Do you want to discard changes?",
				).then((ok) => {
					if (ok) setState(initState);
					else dispatch(setSelected([]));
				});
			}
		} else if (state.action === "update") {
			if (selected.length !== 1 || state.ids[0] !== selected[0]) {
				if (state.edited === state.saved) {
					setState(initState);
					return;
				}
				ConfirmModal.show(
					"Changes not applied! Do you want to discard changes?",
				).then((ok) => {
					if (ok) setState(initState);
					else dispatch(setSelected(state.ids));
				});
			}
		} else if (selected.length > 0) {
			setState(initState);
		}
	}, [selected]);

	const onChange = useCallback(
		(changes: Partial<MembershipEvent>) => {
			setState((state) => {
				if (readOnly || state.action === null) {
					console.warn("onChange: bad state");
					return state;
				}
				if (state.action === "add") {
					return {
						...state,
						edited: { ...state.edited, ...changes },
					};
				} else {
					let edited = { ...state.edited, ...changes };
					if (isEqual(edited, state.saved)) edited = state.saved;
					return {
						...state,
						edited,
					};
				}
			});
		},
		[readOnly],
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
			if (event) dispatch(setSelected([event.id]));
		} else if (state.action === "update") {
			const { edited, saved } = state;
			const update = {
				id: edited.id,
				changes: shallowDiff(saved, edited),
			};
			if (Object.keys(update.changes).length > 0)
				await dispatch(updateMembershipOverTime([update]));
			setState({
				...state,
				saved: edited,
			});
		}
	}, [readOnly, state]);

	const cancel = useCallback(() => {
		setState(initState);
	}, [initState]);

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
		const edited: MembershipEventCreate = {
			date: new Date().toISOString().slice(0, 10),
			count: membersSummary.Voter || 0,
			note: null,
		};

		dispatch(setSelected([]));
		setState({
			action: "add",
			edited: edited,
			saved: undefined,
			ids: [],
		});
	}, [disableAdd, hasChanges, dispatch, membersSummary]);

	const disableDelete = readOnly || state.ids.length === 0;
	const onDelete = useCallback(async () => {
		if (disableDelete) {
			console.warn("onDelete: bad state");
			return;
		}
		const str = `Are you sure you want to delete ${state.ids.length} membership event${state.ids.length > 1 ? "s" : ""}?`;
		const ok = await ConfirmModal.show(str);
		if (ok) {
			if (state.action === "update")
				setState({ ...state, edited: state.saved });
			await dispatch(deleteMembershipOverTime(state.ids));
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
