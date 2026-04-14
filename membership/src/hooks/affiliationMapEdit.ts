import { useReducer, useCallback, useEffect } from "react";
import isEqual from "lodash.isequal";

import { ConfirmModal, shallowDiff } from "@common";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
	AffiliationMap,
	AffiliationMapCreate,
	selectAffiliationMapState,
	setSelected,
	updateAffiliationMaps,
	addAffiliationMaps,
	deleteAffiliationMaps,
} from "@/store/affiliationMap";

const nullAffiliationMap: AffiliationMapCreate = {
	match: "",
	shortAffiliation: "",
};

export type AffiliationMapEditState = (
	| {
			action: null;
			message: string;
	  }
	| {
			action: "add";
			edited: AffiliationMapCreate;
			saved: undefined;
	  }
	| {
			action: "update";
			edited: AffiliationMap;
			saved: AffiliationMap;
	  }
) & { ids: number[] };

type AffiliationMapEditAction =
	| {
			type: "INIT" | "CREATE" | "SUBMIT";
	  }
	| {
			type: "CHANGE";
			changes: Partial<AffiliationMap>;
	  };
const INIT = { type: "INIT" } as const;
const CREATE = { type: "CREATE" } as const;
const SUBMIT = { type: "SUBMIT" } as const;
const CHANGE = (changes: Partial<AffiliationMap>) =>
	({ type: "CHANGE", changes }) as const;

export function useAffiliationMapEdit(readOnly: boolean) {
	const dispatch = useAppDispatch();

	const { entities, selected, loading, valid } = useAppSelector(
		selectAffiliationMapState,
	);

	const initState = useCallback((): AffiliationMapEditState => {
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
			state: AffiliationMapEditState,
			action: AffiliationMapEditAction,
		): AffiliationMapEditState => {
			if (action.type === "INIT") {
				return initState();
			}
			if (action.type === "CREATE") {
				return {
					action: "add",
					edited: nullAffiliationMap,
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
			throw new Error("Unknown action: " + action);
		},
		[initState],
	);

	const [state, dispatchStateAction] = useReducer(
		reducer,
		undefined,
		initState,
	);

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
		(changes: Partial<AffiliationMap>) => {
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
			const [map] = await dispatch(addAffiliationMaps([state.edited]));
			if (map) {
				dispatchStateAction(SUBMIT);
				dispatch(setSelected([map.id]));
			}
		} else if (state.action === "update") {
			const { edited, saved } = state;
			const update = {
				id: edited.id,
				changes: shallowDiff(saved, edited),
			};
			if (Object.keys(update.changes).length > 0)
				await dispatch(updateAffiliationMaps([update]));
			dispatchStateAction(SUBMIT);
		}
	}, [readOnly, state]);

	const cancel = useCallback(() => {
		dispatchStateAction(INIT);
	}, [dispatchStateAction]);

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

	const disableDelete = readOnly || state.action !== "update";
	const onDelete = useCallback(async () => {
		if (disableDelete) {
			console.warn("onDelete: bad state");
			return;
		}
		const str = `Are you sure you want to delete ${state.ids.length} affiliation map${state.ids.length > 1 ? "s" : ""}?`;
		const ok = await ConfirmModal.show(str);
		if (ok) {
			await dispatch(deleteAffiliationMaps(state.ids));
			dispatchStateAction(SUBMIT);
			dispatch(setSelected([]));
		}
	}, [disableDelete, state.ids]);

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
