import * as React from "react";
import { Button, Row, Col } from "react-bootstrap";
import {
	AppTable,
	ShowFilters,
	SplitPanel,
	Panel,
	SplitTableButtonGroup,
	GlobalFilter,
	displayDateRange,
} from "@common";

import { useAppSelector } from "@/store/hooks";
import { fields, membersSelectors, membersActions } from "@/store/members";
import { selectMostRecentAttendedSession } from "@/store/sessions";
import { selectMostRecentBallotSeries } from "@/store/ballotParticipation";

import { tableColumns, defaultTablesConfig } from "./tableColumns";
import { NotificationDetail } from "./detail";
import { refresh } from "./loader";

function MostRecentBallotSummary() {
	const ballotSeries = useAppSelector(selectMostRecentBallotSeries);

	let content: React.ReactNode;
	if (ballotSeries) {
		const ballotNamesStr = ballotSeries.ballotNames.join(", ");
		content = (
			<>
				<div>{ballotSeries.project}</div>
				<div>
					{displayDateRange(ballotSeries.start, ballotSeries.end)}
				</div>
				<div>{ballotNamesStr}</div>
			</>
		);
	} else {
		content = <i>None</i>;
	}

	return (
		<Col className="d-flex flex-column">
			<span>Most recent ballot series:</span>
			{content}
		</Col>
	);
}

function MostRecentSessionSummary() {
	const session = useAppSelector(selectMostRecentAttendedSession);

	let content: React.ReactNode;
	if (session) {
		content = (
			<>
				<div>
					{session.number}{" "}
					{session.type === "p" ? "Plenary: " : "Interim: "}{" "}
					{displayDateRange(session.startDate, session.endDate)}
				</div>
				<div
					style={{
						whiteSpace: "nowrap",
						textOverflow: "ellipsis",
						overflow: "hidden",
					}}
				>
					{session.name}
				</div>
				<div>{`(${session.attendees} attendees)`}</div>
			</>
		);
	} else {
		content = <i>None</i>;
	}

	return (
		<Col className="d-flex flex-column">
			<span>Most recent session:</span>
			{content}
		</Col>
	);
}

function NotificationMain() {
	return (
		<>
			<Row className="w-100 m-3">
				<MostRecentBallotSummary />
				<MostRecentSessionSummary />
				<SplitTableButtonGroup
					xs="auto"
					columns={tableColumns}
					selectors={membersSelectors}
					actions={membersActions}
				/>
				<Col
					xs="auto"
					className="d-flex justify-content-end align-items-center justify-self-stretch ms-auto gap-2"
				>
					<Button
						variant="outline-primary"
						className="bi-arrow-repeat"
						title="Refresh"
						onClick={refresh}
					/>
				</Col>
			</Row>

			<Row className="align-items-center w-100">
				<Col>
					<ShowFilters
						selectors={membersSelectors}
						actions={membersActions}
						fields={fields}
					/>
				</Col>
				<Col xs={3} sm={2}>
					<GlobalFilter
						selectors={membersSelectors}
						actions={membersActions}
					/>
				</Col>
			</Row>

			<SplitPanel selectors={membersSelectors} actions={membersActions}>
				<Panel>
					<AppTable
						defaultTablesConfig={defaultTablesConfig}
						columns={tableColumns}
						headerHeight={50}
						estimatedRowHeight={50}
						selectors={membersSelectors}
						actions={membersActions}
					/>
				</Panel>
				<Panel className="details-panel" style={{ overflow: "hidden" }}>
					<NotificationDetail />
				</Panel>
			</SplitPanel>
		</>
	);
}

export default NotificationMain;
