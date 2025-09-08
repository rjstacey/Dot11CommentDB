import { Row, Col, Button } from "react-bootstrap";
import { ConfirmModal, TableColumnSelector } from "@common";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectIsOnline } from "@/store/offline";
import { BallotType, selectBallot } from "@/store/ballots";
import {
	deleteVoters,
	exportVoters,
	selectVotersState,
	selectVotersBallot_id,
	refreshVoters,
	votersActions,
	votersSelectors,
} from "@/store/voters";
import VotersImportButton from "./VotersImport";
import ProjectBallotSelector from "@/components/ProjectBallotSelector";

import { getDefaultVoter, VotersContext } from "./layout";
import { tableColumns } from "./tableColumns";

function InitialBallot() {
	const id = useAppSelector(selectVotersBallot_id);
	const b = useAppSelector((state) =>
		id ? selectBallot(state, id) : undefined
	);
	const descr =
		b?.Type === BallotType.WG
			? `${b.BallotID} on ${b.Document}`
			: "This is not a WG ballot";

	return (
		<Col xs="auto" className="d-flex flex-column">
			<span>Voting poll formed with WG initial ballot</span>
			<span>{descr}</span>
		</Col>
	);
}

function VotersActions({ setVotersState }: VotersContext) {
	const dispatch = useAppDispatch();
	const isOnline = useAppSelector(selectIsOnline);
	const votersBallot_id = useAppSelector(selectVotersBallot_id);
	const { loading, selected } = useAppSelector(selectVotersState);
	const shownIds = useAppSelector(votersSelectors.selectSortedFilteredIds);

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
		<Row className="w-100 justify-content-between align-items-center">
			<Col>
				<ProjectBallotSelector />
			</Col>
			<Col>
				<TableColumnSelector
					actions={votersActions}
					selectors={votersSelectors}
					columns={tableColumns}
				/>
			</Col>
			<InitialBallot />
			<Col xs="auto" className="d-flex justify-content-end gap-2">
				<VotersImportButton ballot_id={votersBallot_id} />
				<Button
					variant="light"
					name="export"
					title="Export voters"
					disabled={!votersBallot_id || !isOnline}
					onClick={() => dispatch(exportVoters())}
				>
					Export voters
				</Button>
				<Button
					variant="outline-primary"
					className="bi-plus-lg"
					name="add"
					title="Add voter"
					disabled={!votersBallot_id}
					onClick={handleAddVoter}
				/>
				<Button
					variant="outline-primary"
					className="bi-trash"
					name="delete"
					title="Remove selected"
					disabled={selected.length === 0}
					onClick={handleRemoveSelected}
				/>
				<Button
					variant="outline-primary"
					className="bi-arrow-repeat"
					name="refresh"
					title="Refresh"
					onClick={() => dispatch(refreshVoters())}
					disabled={loading || !isOnline}
				/>
			</Col>
		</Row>
	);
}

export default VotersActions;
