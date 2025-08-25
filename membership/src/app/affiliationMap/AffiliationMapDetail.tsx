import * as React from "react";
import { Button } from "react-bootstrap";
import { shallowEqual } from "react-redux";
import type { EntityId } from "@reduxjs/toolkit";

import { ConfirmModal } from "dot11-components";

import {
	useAffiliationMapAdd,
	useAffiliationMapUpdate,
	useAffiliationMapsDelete,
} from "./utils";
import { EditAction, AffiliationMapEntryForm } from "./AffiliationMapEntry";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
	AffiliationMap,
	selectAffiliationMapState,
	setSelected,
} from "@/store/affiliationMap";
import AffiliationMapTest from "./AffiliationMapMatches";
import AffiliationMapUnmatched from "./AffiliationMapUnmatched";

type AffiliationMapDetailState = {
	action: EditAction | null;
	edited: AffiliationMap | undefined;
	saved: AffiliationMap | undefined;
	id: EntityId | undefined;
	placeholder: string;
};

function GroupDetail() {
	const dispatch = useAppDispatch();

	const readOnly = false;

	const { entities, selected, loading, valid } = useAppSelector(
		selectAffiliationMapState
	);

	const initState = React.useCallback((): AffiliationMapDetailState => {
		let action: EditAction | null = null;
		let id: EntityId | undefined;
		let entry: AffiliationMap | undefined;
		let placeholder = "";

		if (loading && !valid) placeholder = "Loading...";
		else if (selected.length > 1) placeholder = "Multiple selected";
		else if (selected.length === 0) placeholder = "Nothing selected";
		else {
			action = "view";
			id = selected[0];
			entry = entities[id];
		}

		return {
			action,
			edited: entry,
			saved: entry,
			id,
			placeholder,
		};
	}, [loading, valid, selected, entities]);

	const [state, setState] = React.useState(initState);
	const [busy, setBusy] = React.useState(false);

	React.useEffect(() => {
		if (
			(state.action === null && selected.length === 1) ||
			(state.action === "view" &&
				(selected.length !== 1 || state.id !== selected[0]))
		) {
			setState(initState);
		} else if (
			state.action === "update" &&
			(selected.length !== 1 || state.id !== selected[0])
		) {
			ConfirmModal.show(
				"Changes not applied! Do you want to discard changes?"
			).then((ok) => {
				if (ok) setState(initState);
				else dispatch(setSelected([state.id!]));
			});
		} else if (state.action === "add" && selected.length > 0) {
			if (state.edited !== state.saved) {
				ConfirmModal.show(
					"Changes not applied! Do you want to discard changes?"
				).then((ok) => {
					if (ok) setState(initState);
					else dispatch(setSelected([]));
				});
			} else {
				setState(initState);
			}
		}
	}, [state, selected, initState, dispatch]);

	const changeEntry = (changes: Partial<AffiliationMap>) => {
		if (readOnly || state.edited === null || state.saved === null) {
			console.warn("Update with insufficient access");
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

	const mapAdd = useAffiliationMapAdd();

	const add = async () => {
		if (readOnly || !state.edited) {
			console.warn("Add with unexpected state");
			return;
		}
		const { edited } = state;
		setState((state) => ({
			...state,
			saved: state.edited,
		}));
		setBusy(true);
		const newMap = await mapAdd(edited);
		setBusy(false);
		if (newMap) dispatch(setSelected([newMap.id]));
	};

	const mapUpdate = useAffiliationMapUpdate();

	const update = async () => {
		if (readOnly || !state.edited || !state.saved) {
			console.warn("Update with unexpected state");
			return;
		}
		const { edited, saved } = state;
		setBusy(true);
		await mapUpdate(edited, saved);
		setBusy(false);
		setState((state) => ({
			...state,
			action: "view",
			saved: edited,
		}));
	};

	const cancel = async () => {
		setState(initState);
	};

	const clickAdd = async () => {
		if (state.action === "update") {
			const ok = await ConfirmModal.show(
				`Changes not applied! Do you want to discard changes?`
			);
			if (!ok) return;
		}
		dispatch(setSelected([]));
		const entry: AffiliationMap = {
			id: 0,
			groupId: "",
			match: "",
			shortAffiliation: "",
		};
		setState({
			action: "add",
			edited: entry,
			saved: entry,
			id: undefined,
			placeholder: "",
		});
	};

	const mapsDelete = useAffiliationMapsDelete();

	const clickDelete = async () => {
		if (readOnly) {
			console.warn("Delete with unexpected state");
			return;
		}
		const str = "Are you sure you want to the selected mappings?";
		const ok = await ConfirmModal.show(str);
		if (ok) {
			await mapsDelete(selected);
			setSelected([]);
		}
	};

	let title = "",
		submit: (() => void) | undefined;
	if (state.action === "add") {
		title = "Add map";
		submit = add;
	} else if (state.action === "update") {
		title = "Update map";
		submit = update;
	}

	return (
		<>
			<div className="d-flex align-items-center justify-content-between mb-3">
				<h3 style={{ color: "#0099cc", margin: 0 }}>{title}</h3>
				<div className="d-flex gap-2">
					<Button
						variant="outline-primary"
						className="bi-plus-lg"
						title="Add map"
						disabled={loading || readOnly}
						active={state.action === "add"}
						onClick={clickAdd}
					/>
					<Button
						variant="outline-danger"
						className="bi-trash"
						title="Delete map"
						disabled={loading || selected.length === 0 || readOnly}
						onClick={clickDelete}
					/>
				</div>
			</div>
			{state.action === null ? (
				<>
					<div className="details-panel-placeholder">
						{state.placeholder}
					</div>
					{selected.length === 0 && <AffiliationMapUnmatched />}
				</>
			) : (
				<>
					<AffiliationMapEntryForm
						action={state.action}
						entry={state.edited!}
						change={changeEntry}
						submit={submit}
						cancel={submit ? cancel : undefined}
						busy={busy}
						readOnly={readOnly}
					/>
					<AffiliationMapTest map={state.edited!} />
				</>
			)}
		</>
	);
}

export default GroupDetail;
