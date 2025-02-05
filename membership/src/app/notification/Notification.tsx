import React from "react";
import { useNavigate } from "react-router";

import {
	AppTable,
	TableColumnSelector,
	TableViewSelector,
	SplitPanelButton,
	ShowFilters,
	SplitPanel,
	Panel,
	ButtonGroup,
	ActionButton,
	displayDateRange,
} from "dot11-components";

import { useAppSelector } from "@/store/hooks";
import { fields, membersSelectors, membersActions } from "@/store/members";
import { selectMostRecentAttendedSession } from "@/store/sessions";
import { selectMostRecentBallotSeries } from "@/store/ballotParticipation";

import NotificationEmail from "./NotificationEmail";
import { tableColumns, defaultTablesConfig } from "./notificationTableColumns";

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
	const navigate = useNavigate();
	const refresh = () => navigate(".", { replace: true });

	return (
		<>
			<div className="top-row">
				<MostRecentBallotSummary />
				<MostRecentSessionSummary />
				<div style={{ display: "flex" }}>
					<ButtonGroup>
						<div>Table view</div>
						<div style={{ display: "flex" }}>
							<TableViewSelector
								selectors={membersSelectors}
								actions={membersActions}
							/>
							<TableColumnSelector
								selectors={membersSelectors}
								actions={membersActions}
								columns={tableColumns}
							/>
							<SplitPanelButton
								selectors={membersSelectors}
								actions={membersActions}
							/>
						</div>
					</ButtonGroup>
					<ActionButton
						name="refresh"
						title="Refresh"
						onClick={refresh}
					/>
				</div>
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
					<NotificationEmail />
				</Panel>
			</SplitPanel>
		</>
	);
}

export default Members;
