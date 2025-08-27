import * as React from "react";
import { Row, Col } from "react-bootstrap";
import { Outlet } from "react-router";
import { SessionsSelector } from "./SessionsSelector";
import { StatusesSelector } from "./StatusesSelector";
import { ChartActions } from "../ChartActions";

export type SessionParticipationReportContext = {
	selected: number[];
	statuses: string[];
};

export function SessionParticipationReport() {
	const [selected, setSelected] = React.useState<number[]>([]);
	const [statuses, setStatuses] = React.useState<string[]>([
		"Aspirant",
		"Potential Voter",
		"Voter",
	]);
	return (
		<div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
			<Row>
				<Col xs="auto">
					<SessionsSelector
						selected={selected}
						setSelected={setSelected}
					/>
					<StatusesSelector
						statuses={statuses}
						setStatuses={setStatuses}
					/>
				</Col>
				<ChartActions />
			</Row>
			<Outlet
				context={
					{
						selected,
						statuses,
					} satisfies SessionParticipationReportContext
				}
			/>
		</div>
	);
}

export default SessionParticipationReport;
