import { Row, Col, Button } from "react-bootstrap";
import { SplitTableButtonGroup } from "@common";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectIsOnline } from "@/store/offline";
import { Ballot, BallotType, selectBallot, getBallotId } from "@/store/ballots";
import {
	exportVoters,
	selectVotersState,
	selectVotersBallot_id,
	refreshVoters,
	votersActions,
	votersSelectors,
} from "@/store/voters";
import VotersImportButton from "./VotersImport";
import ProjectBallotSelector from "@/components/ProjectBallotSelector";

import { tableColumns } from "./tableColumns";

function BallotInfo({ ballot }: { ballot: Ballot | undefined }) {
	const descr =
		ballot?.Type === BallotType.WG
			? `${getBallotId(ballot)} on ${ballot.Document}`
			: "This is not a WG ballot";

	return (
		<Col xs="auto" className="d-flex flex-column">
			<span>Voting poll formed with WG initial ballot</span>
			<span>{descr}</span>
		</Col>
	);
}

function VotersActions() {
	const dispatch = useAppDispatch();
	const isOnline = useAppSelector(selectIsOnline);
	const votersBallot_id = useAppSelector(selectVotersBallot_id);
	const b = useAppSelector((state) =>
		votersBallot_id ? selectBallot(state, votersBallot_id) : undefined
	);
	const isWgBallot = b?.Type === BallotType.WG;
	const { loading } = useAppSelector(selectVotersState);

	return (
		<Row className="w-100 justify-content-between align-items-center">
			<Col>
				<ProjectBallotSelector />
			</Col>
			{isWgBallot && (
				<Col xs="auto">
					<SplitTableButtonGroup
						actions={votersActions}
						selectors={votersSelectors}
						columns={tableColumns}
					/>
				</Col>
			)}
			<BallotInfo ballot={b} />
			<Col xs="auto" className="d-flex justify-content-end gap-2">
				<VotersImportButton ballot={b} />
				<Button
					variant="light"
					name="export"
					title="Export voters"
					disabled={!isWgBallot || !isOnline}
					onClick={() => dispatch(exportVoters())}
				>
					Export voters
				</Button>
				<Button
					variant="outline-secondary"
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
