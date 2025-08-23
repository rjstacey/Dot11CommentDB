import { Row, Col, Form } from "react-bootstrap";
import { displayDateRange } from "dot11-components";
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
		<Row className="w-100">
			{sessions.map((session) => (
				<Col key={session.id} xs={2}>
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
						<Form.Check
							checked={selected.includes(session.id)}
							onChange={() => toggleSelected(session.id)}
						/>
					</div>
				</Col>
			))}
		</Row>
	);
}
