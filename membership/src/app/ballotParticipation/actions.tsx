import {
	ActionButton,
	TableColumnSelector,
	SplitPanelButton,
	displayDateRange,
} from "dot11-components";

import { useAppSelector } from "@/store/hooks";
import {
	selectBallotEntities,
	ballotParticipationSelectors,
	ballotParticipationActions,
	selectSyncedBallotSeriesEntities,
	selectBallotSeriesIds,
} from "@/store/ballotParticipation";

import { BulkStatusUpdate } from "../sessionParticipation/actions/BulkStatusUpdate";
import { useTableColumns } from "./tableColumns";
import { refresh } from "./loader";

function BallotSeriesSummary() {
	const ballotSeriesIds = useAppSelector(selectBallotSeriesIds);
	const ballotSeriesEntities = useAppSelector(
		selectSyncedBallotSeriesEntities
	);
	const ballotEntities = useAppSelector(selectBallotEntities);

	const elements = ballotSeriesIds.map((id) => {
		const ballotSeries = ballotSeriesEntities[id]!;
		const ballotNamesStr = ballotSeries.ballotNames.join(", ");
		return (
			<div key={id} style={{ display: "flex", flexDirection: "column" }}>
				<div>{ballotEntities[id]!.Project}</div>
				<div>
					{displayDateRange(ballotSeries.start, ballotSeries.end)}
				</div>
				<div>{ballotNamesStr}</div>
			</div>
		);
	});

	return <>{elements}</>;
}

export function BallotParticipationActions() {
	const [tableColumns] = useTableColumns();
	return (
		<div className="top-row">
			<BallotSeriesSummary />
			<div style={{ display: "flex" }}>
				<BulkStatusUpdate isSession={false} />
				<TableColumnSelector
					selectors={ballotParticipationSelectors}
					actions={ballotParticipationActions}
					columns={tableColumns}
				/>
				<SplitPanelButton
					selectors={ballotParticipationSelectors}
					actions={ballotParticipationActions}
				/>
				<ActionButton
					name="refresh"
					title="Refresh"
					onClick={refresh}
				/>
			</div>
		</div>
	);
}
