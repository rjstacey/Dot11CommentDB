import React from "react";
import { Outlet } from "react-router";
import { SessionsSelector } from "./SessionsSelector";
import { StatusesSelector } from "./StatusesSelector";

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
		<div style={{ display: "flex", flexDirection: "column" }}>
			<SessionsSelector selected={selected} setSelected={setSelected} />
			<StatusesSelector statuses={statuses} setStatuses={setStatuses} />
			<div
				style={{
					display: "flex",
					flexDirection: "row",
					flex: 1,
					width: "100%",
				}}
			>
				<Outlet
					context={
						{
							selected,
							statuses,
						} satisfies SessionParticipationReportContext
					}
				/>
			</div>
		</div>
	);
}
