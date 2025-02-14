import { Checkbox, displayDateRange } from "dot11-components";
import { useAppSelector } from "@/store/hooks";
import { selectRecentSessions } from "@/store/sessions";

export function SessionsSelector({
	selected,
	setSelected,
}: {
	selected: number[];
	setSelected: (selected: number[]) => void;
}) {
	const sessions = useAppSelector(selectRecentSessions);

	function toggleSelected(id: number) {
		const newSelected = selected.slice();
		const i = selected.indexOf(id);
		if (i >= 0) newSelected.splice(i, 1);
		else newSelected.push(id);
		setSelected(newSelected);
	}

	return (
		<div
			style={{
				display: "flex",
				flexWrap: "wrap",
				overflow: "auto",
				margin: "10px 0",
			}}
		>
			{sessions.map((session) => (
				<div
					key={session.id}
					style={{
						display: "flex",
						flexDirection: "column",
						margin: 5,
					}}
				>
					<div style={{ whiteSpace: "nowrap" }}>
						{session.number}{" "}
						{session.type === "p" ? "Plenary: " : "Interim: "}{" "}
						{displayDateRange(session.startDate, session.endDate)}
					</div>
					<div
						style={{
							whiteSpace: "nowrap",
							textOverflow: "ellipsis",
							overflow: "hidden",
							maxWidth: 200,
						}}
					>
						{session.name}
					</div>
					<div style={{ display: "flex" }}>
						<div>{`(${session.attendees} attendees)`}</div>
					</div>
					<div style={{ display: "flex" }}>
						<Checkbox
							checked={selected.includes(session.id)}
							onChange={() => toggleSelected(session.id)}
						/>
					</div>
				</div>
			))}
		</div>
	);
}
