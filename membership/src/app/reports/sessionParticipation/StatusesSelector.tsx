import { Row, Col, Form } from "react-bootstrap";

export function StatusesSelector({
	statuses,
	setStatuses,
}: {
	statuses: string[];
	setStatuses: (statuses: string[]) => void;
}) {
	function toggleStatus(status: string) {
		if (statuses.includes(status)) {
			setStatuses(statuses.filter((s) => s !== status));
		} else {
			setStatuses([...statuses, status]);
		}
	}
	return (
		<Row>
			<Form.Group as={Col} controlId="aspirant" className="d-flex gap-2">
				<Form.Check
					checked={statuses.includes("Aspirant")}
					onChange={() => toggleStatus("Aspirant")}
				/>
				<Form.Label>Aspirant</Form.Label>
			</Form.Group>
			<Form.Group
				as={Col}
				controlId="potentialVoter"
				className="d-flex gap-2"
			>
				<Form.Check
					checked={statuses.includes("Potential Voter")}
					onChange={() => toggleStatus("Potential Voter")}
				/>
				<Form.Label>Potential Voter</Form.Label>
			</Form.Group>
			<Form.Group as={Col} controlId="voter" className="d-flex gap-2">
				<Form.Check
					checked={statuses.includes("Voter")}
					onChange={() => toggleStatus("Voter")}
				/>
				<Form.Label>Voter</Form.Label>
			</Form.Group>
			<Form.Group as={Col} controlId="nonVoter" className="d-flex gap-2">
				<Form.Check
					checked={statuses.includes("Non-Voter")}
					onChange={() => toggleStatus("Non-Voter")}
				/>
				<Form.Label>Non-Voter</Form.Label>
			</Form.Group>
			<Form.Group as={Col} controlId="exOfficio" className="d-flex gap-2">
				<Form.Check
					checked={statuses.includes("ExOfficio")}
					onChange={() => toggleStatus("ExOfficio")}
				/>
				<Form.Label>Ex-Officio</Form.Label>
			</Form.Group>
		</Row>
	);
}
