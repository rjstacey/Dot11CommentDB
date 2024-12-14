import { TableColumnSelector, ActionButton } from "dot11-components";

import ResultsSummary from "./ResultsSummary";
import ResultsExport from "./ResultsExport";

import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
	selectResultsBallot_id,
	resultsSelectors,
	resultsActions,
	refreshResults,
} from "../store/results";
import { selectBallot } from "../store/ballots";
import { selectIsOnline } from "../store/offline";

import { tableColumns } from "./table";

function ResultsActions() {
	const dispatch = useAppDispatch();
	const isOnline = useAppSelector(selectIsOnline);

	const resultsBallot_id = useAppSelector(selectResultsBallot_id);
	const resultsBallot = useAppSelector((state) =>
		resultsBallot_id ? selectBallot(state, resultsBallot_id) : undefined
	);

	return (
		<div style={{ display: "flex" }}>
			<ResultsSummary />
			<ResultsExport ballot={resultsBallot} />
			<TableColumnSelector
				selectors={resultsSelectors}
				actions={resultsActions}
				columns={tableColumns}
			/>
			<ActionButton
				name="refresh"
				title="Refresh"
				disabled={!isOnline}
				onClick={() => dispatch(refreshResults())}
			/>
		</div>
	);
}

export default ResultsActions;
