import * as React from "react";
import { Form, Button, Row, Col, DropdownButton } from "react-bootstrap";

import { useAppDispatch } from "@/store/hooks";
import { exportAttendees } from "@/store/sessionAttendanceSummary";

function ExportAttendeesListForm({
	groupName,
	sessionNumber,
}: {
	groupName: string;
	sessionNumber: number;
}) {
	const dispatch = useAppDispatch();
	const [format, setFormat] = React.useState<"dvl" | "minutes">("minutes");

	function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		dispatch(exportAttendees(groupName, sessionNumber, format));
	}

	return (
		<Form onSubmit={handleSubmit} className="p-3" style={{ minWidth: 400 }}>
			<Row className="mb-3">
				<Col>
					<Form.Check
						type="radio"
						id="minutes"
						name="format"
						value="minutes"
						checked={format === "minutes"}
						onChange={() => setFormat("minutes")}
						label="WG minutes"
					/>
					<Form.Text>
						Exports a list of attendees for this session, as
						required for WG minutes
					</Form.Text>
				</Col>
			</Row>
			<Row className="mb-3">
				<Col>
					<Form.Check
						type="radio"
						id="dvl"
						name="format"
						value="dvl"
						checked={format === "dvl"}
						onChange={() => setFormat("dvl")}
						label="DirectVoteLive"
					/>
					<Form.Text>
						Exports a list of voters registered for this session
					</Form.Text>
				</Col>
			</Row>
			<Row>
				<Col className="d-flex justify-content-end">
					<Button type="submit">Export</Button>
				</Col>
			</Row>
		</Form>
	);
}

export function ExportAttendeesList(
	props: React.ComponentProps<typeof ExportAttendeesListForm>
) {
	return (
		<DropdownButton
			variant="success-outline"
			align="end"
			title={"Export attendees"}
		>
			<ExportAttendeesListForm {...props} />
		</DropdownButton>
	);
}
