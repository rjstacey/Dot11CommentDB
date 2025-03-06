import React from "react";
import { SessionsSelector } from "./SessionsSelector";
//import { SessionParticipationTable } from "./Table";
import { CummulativeChart } from "./CumulativeChart";
import { PerSessionChart } from "./PerSessionChart";
import { Button, ActionButton, Checkbox } from "dot11-components";
import { copyChartToClipboard } from "@/components/copyChart";

export function SessionParticipationStats() {
	const [selected, setSelected] = React.useState<number[]>([]);
	const [statuses, setStatuses] = React.useState<string[]>([
		"Aspirant",
		"Potential Voter",
		"Voter",
	]);
	const [chart, setChart] = React.useState<"cumulative" | "per-session">(
		"per-session"
	);

	function toggleStatus(status: string) {
		if (statuses.includes(status)) {
			setStatuses(statuses.filter((s) => s !== status));
		} else {
			setStatuses([...statuses, status]);
		}
	}

	return (
		<>
			<SessionsSelector selected={selected} setSelected={setSelected} />
			<div
				style={{
					display: "flex",
					flexDirection: "row",
					flex: 1,
					width: "100%",
				}}
			>
				<div style={{ display: "flex", flexDirection: "column" }}>
					<ActionButton
						name="copy"
						title="Copy chart to clipboard"
						onClick={() => copyChartToClipboard("#chart")}
					/>
					<Button onClick={() => setChart("per-session")}>
						Each Session
					</Button>
					<Button onClick={() => setChart("cumulative")}>
						Cumulative
					</Button>
					<label>
						<Checkbox
							checked={statuses.includes("Aspirant")}
							onChange={() => toggleStatus("Aspirant")}
						/>
						<span>Aspirant</span>
					</label>
					<label>
						<Checkbox
							checked={statuses.includes("Potential Voter")}
							onChange={() => toggleStatus("Potential Voter")}
						/>
						<span>Potential Voter</span>
					</label>
					<label>
						<Checkbox
							checked={statuses.includes("Voter")}
							onChange={() => toggleStatus("Voter")}
						/>
						<span>Voter</span>
					</label>
					<label>
						<Checkbox
							checked={statuses.includes("Non-Voter")}
							onChange={() => toggleStatus("Non-Voter")}
						/>
						<span>Non-Voter</span>
					</label>
					<label>
						<Checkbox
							checked={statuses.includes("ExOfficio")}
							onChange={() => toggleStatus("ExOfficio")}
						/>
						<span>Ex-Officio</span>
					</label>
				</div>
				{chart === "cumulative" ? (
					<CummulativeChart selected={selected} statuses={statuses} />
				) : (
					<PerSessionChart selected={selected} statuses={statuses} />
				)}
			</div>
		</>
	);
}
