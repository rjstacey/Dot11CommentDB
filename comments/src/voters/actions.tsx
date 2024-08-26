import * as React from "react";
import { useNavigate } from "react-router-dom";

import { ConfirmModal, ActionButton } from "dot11-components";

import { useAppDispatch, useAppSelector } from "../store/hooks";
import { selectIsOnline } from "../store/offline";
import {
	deleteVoters,
	exportVoters,
	selectVotersState,
	selectVotersBallot_id,
	votersSelectors,
	VoterCreate,
} from "../store/voters";
import VotersImportButton from "./VotersImport";

import type { SetVotersState } from "./layout";

function getDefaultVoter(ballot_id: number): VoterCreate {
	let voter: VoterCreate = {
		ballot_id,
		SAPIN: 0,
		Status: "Voter",
	};
	return voter;
}

function VotersActions({ setVotersState }: { setVotersState: SetVotersState }) {
	const dispatch = useAppDispatch();
	const navigate = useNavigate();

	const isOnline = useAppSelector(selectIsOnline);

	const votersBallot_id = useAppSelector(selectVotersBallot_id);
	const { loading, selected } = useAppSelector(selectVotersState);
	const shownIds = useAppSelector(votersSelectors.selectSortedFilteredIds);

	const refresh = () => navigate(".", { replace: true });

	async function handleRemoveSelected() {
		const ids = selected.filter((id) => shownIds.includes(id)); // only select checked items that are visible
		if (ids.length) {
			const ok = await ConfirmModal.show(
				`Are you sure you want to delete ${ids.length} entries?`
			);
			if (ok) await dispatch(deleteVoters(ids));
		}
	}

	const handleAddVoter = () =>
		setVotersState({
			action: "add",
			voter: getDefaultVoter(votersBallot_id!),
		});

	return (
		<>
			<div style={{ display: "flex" }}>
				<ActionButton
					name="add"
					title="Add voter"
					disabled={!votersBallot_id}
					onClick={handleAddVoter}
				/>
				<ActionButton
					name="delete"
					title="Remove selected"
					disabled={selected.length === 0}
					onClick={handleRemoveSelected}
				/>
				<VotersImportButton ballot_id={votersBallot_id} />
				<ActionButton
					name="export"
					title="Export voters"
					disabled={!votersBallot_id || !isOnline}
					onClick={() => dispatch(exportVoters(votersBallot_id!))}
				/>
				<ActionButton
					name="refresh"
					title="Refresh"
					onClick={refresh}
					disabled={loading || !isOnline}
				/>
			</div>
		</>
	);
}

export default VotersActions;
