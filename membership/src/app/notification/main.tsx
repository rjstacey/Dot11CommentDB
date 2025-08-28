import * as React from "react";
import { Button } from "react-bootstrap";
import { displayDateRange } from "@components/lib";
import {
	AppTable,
	ShowFilters,
	SplitPanel,
	Panel,
	SplitTableButtonGroup,
} from "@components/table";

import { useAppSelector } from "@/store/hooks";
import { fields, membersSelectors, membersActions } from "@/store/members";
import { selectMostRecentAttendedSession } from "@/store/sessions";
import { selectMostRecentBallotSeries } from "@/store/ballotParticipation";

import { tableColumns, defaultTablesConfig } from "./notificationTableColumns";
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
		<div style={{ display: "flex", flexDirection: "column" }}>
			<span>Most recent ballot series:</span>
			{content}
		</div>
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
		<div style={{ display: "flex", flexDirection: "column" }}>
			<span>Most recent session:</span>
			{content}
		</div>
	);
}

function Members() {
	return (
		<>
			<div className="top-row">
				<MostRecentBallotSummary />
				<MostRecentSessionSummary />
				<SplitTableButtonGroup
					columns={tableColumns}
					selectors={membersSelectors}
					actions={membersActions}
				/>
				<Button
					variant="outline-primary"
					className="bi-arrow-repeat"
					title="Refresh"
					onClick={refresh}
				/>
			</div>

			<div style={{ display: "flex", width: "100%" }}>
				<ShowFilters
					selectors={membersSelectors}
					actions={membersActions}
					fields={fields}
				/>
			</div>

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

export default Members;
