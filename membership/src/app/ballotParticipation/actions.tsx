import { Row, Col, Button } from "react-bootstrap";
import {
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

	return ballotSeriesIds.map((id) => {
		const ballotSeries = ballotSeriesEntities[id]!;
		const ballotNamesStr = ballotSeries.ballotNames.join(", ");
		const project = ballotEntities[id]!.Project;
		return (
			<Col
				key={id}
				className="d-flex flex-column"
				style={{
					maxWidth: 300,
				}}
			>
				<div>{project}</div>
				<div className="text-nowrap">
					{displayDateRange(ballotSeries.start, ballotSeries.end)}
				</div>
				<div className="text-truncate">{ballotNamesStr}</div>
			</Col>
		);
	});
}

export function BallotParticipationActions() {
	const [tableColumns] = useTableColumns();
	return (
		<Row className="w-100 align-items-center gap-2">
			<BallotSeriesSummary />
			<Col className="d-flex align-items-center justify-content-end gap-2">
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
				<Button
					variant="outline-primary"
					className="bi-arrow-repeat"
					name="refresh"
					title="Refresh"
					onClick={refresh}
				/>
			</Col>
		</Row>
	);
}
