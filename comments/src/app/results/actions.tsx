import { Row, Col, Button } from "react-bootstrap";
import { SplitTableButtonGroup } from "@common";

import { ResultsSummary } from "./ResultsSummary";
import { ResultsExport } from "./ResultsExport";
import ProjectBallotSelector from "@/components/ProjectBallotSelector";

import { useAppSelector } from "@/store/hooks";
import {
	selectResultsBallot_id,
	resultsSelectors,
	resultsActions,
} from "@/store/results";
import { selectBallot } from "@/store/ballots";
import { selectIsOnline } from "@/store/offline";

import { refresh } from "./laoder";
import { tableColumns } from "./tableColumns";

export function ResultsActions() {
	const isOnline = useAppSelector(selectIsOnline);

	const resultsBallot_id = useAppSelector(selectResultsBallot_id);
	const resultsBallot = useAppSelector((state) =>
		resultsBallot_id ? selectBallot(state, resultsBallot_id) : undefined
	);

	return (
		<Row className="w-100 justify-content-between align-items-center">
			<Col>
				<ProjectBallotSelector />
			</Col>
			<SplitTableButtonGroup
				xs="auto"
				selectors={resultsSelectors}
				actions={resultsActions}
				columns={tableColumns}
			/>
			<Col xs="auto" className="d-flex justify-content-end gap-2">
				<ResultsSummary />
				<ResultsExport ballot={resultsBallot} />
				<Button
					variant="outline-secondary"
					className="bi-arrow-repeat"
					title="Refresh"
					disabled={!isOnline}
					onClick={refresh}
				/>
			</Col>
		</Row>
	);
}
