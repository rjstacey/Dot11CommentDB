import { useState } from "react";
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
	const [selected, setSelected] = useState<number[]>([]);
	const [statuses, setStatuses] = useState<string[]>([
		"Aspirant",
		"Potential Voter",
		"Voter",
	]);
	return (
		<>
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
		</>
	);
}

export default SessionParticipationReport;
