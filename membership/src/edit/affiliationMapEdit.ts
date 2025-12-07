import * as React from "react";
import { shallowEqual } from "react-redux";
import type { EntityId } from "@reduxjs/toolkit";

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
) & { ids: EntityId[] };

export function useAffiliationMapEdit(readOnly: boolean) {
	const dispatch = useAppDispatch();

	const { entities, selected, loading, valid } = useAppSelector(
		selectAffiliationMapState
	);

	const initState = React.useCallback((): AffiliationMapEditState => {
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
					ids: selected,
				};
			} else {
				message = "Selected entity not found";
			}
		}

		return {
			action: null,
			message,
			ids: selected,
		};
	}, [loading, valid, selected, entities]);

	const [state, setState] = React.useState(initState);

	React.useEffect(() => {
		if (state.action === "add") {
			if (selected.length > 0) {
				ConfirmModal.show(
					"Changes not applied! Do you want to discard changes?"
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
					"Changes not applied! Do you want to discard changes?"
				).then((ok) => {
					if (ok) setState(initState);
					else dispatch(setSelected(state.ids));
				});
			}
		} else if (selected.length > 0) {
			setState(initState);
		}
	}, [selected]);

	const onChange = React.useCallback(
		(changes: Partial<AffiliationMap>) => {
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
					if (shallowEqual(edited, state.saved)) edited = state.saved;
					return {
						...state,
						edited,
					};
				}
			});
		},
		[readOnly]
	);

	const submit = React.useCallback(async () => {
		if (readOnly || state.action === null) {
			console.warn("submit: bad state");
			return;
		}
		if (state.action === "add") {
			const [map] = await dispatch(addAffiliationMaps([state.edited]));
			if (map) dispatch(setSelected([map.id]));
		} else if (state.action === "update") {
			const { edited, saved } = state;
			const update = {
				id: edited.id,
				changes: shallowDiff(saved, edited),
			};
			if (Object.keys(update.changes).length > 0)
				await dispatch(updateAffiliationMaps([update]));
			setState({
				...state,
				saved: edited,
			});
		}
	}, [readOnly, state]);

	const cancel = React.useCallback(() => {
		setState(initState);
	}, [initState]);

	const hasChanges = React.useCallback(
		() =>
			state.action === "add" ||
			(state.action === "update" && state.edited !== state.saved),
		[state]
	);

	const disableAdd = readOnly;
	const onAdd = React.useCallback(async () => {
		if (disableAdd) {
			console.warn("onAdd: bad state");
			return;
		}
		if (hasChanges()) {
			const ok = await ConfirmModal.show(
				`Changes not applied! Do you want to discard changes?`
			);
			if (!ok) return;
		}
		dispatch(setSelected([]));
		setState({
			action: "add",
			edited: nullAffiliationMap,
			saved: undefined,
			ids: [],
		});
	}, [disableAdd, hasChanges]);

	const disableDelete = readOnly || state.ids.length === 0;
	const onDelete = React.useCallback(async () => {
		if (disableDelete) {
			console.warn("onDelete: bad state");
			return;
		}
		const str = `Are you sure you want to delete ${state.ids.length} affiliation map${state.ids.length > 1 ? "s" : ""}?`;
		const ok = await ConfirmModal.show(str);
		if (ok) {
			if (state.action === "update")
				setState({ ...state, edited: state.saved });
			await dispatch(deleteAffiliationMaps(state.ids));
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
