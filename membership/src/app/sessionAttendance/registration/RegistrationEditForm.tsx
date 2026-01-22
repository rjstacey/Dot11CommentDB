import React from "react";
import { Row, Col, Table, Form, Button } from "react-bootstrap";

import { AttendanceInfoEdit } from "../attendance/AttendanceInfoEdit";
import type {
	SessionAttendanceSummary,
	SessionAttendanceSummaryChange,
} from "@/store/attendanceSummaries";

import { SubmitCancelRow } from "@/components/SubmitCancelRow";

import { useAppDispatch } from "@/store/hooks";
import {
	updateOneSessionRegistration,
	type SessionRegistration,
} from "@/store/sessionRegistration";
import type { MemberCreate } from "@/store/members";

export function RegistrationEditForm({
	member,
	registration,
	edited,
	saved,
	onChange,
	hasChanges,
	submit,
	cancel,
}: {
	member: MemberCreate;
	registration: SessionRegistration;
	edited: SessionAttendanceSummary;
	saved: SessionAttendanceSummary;
	onChange: (changes: SessionAttendanceSummaryChange) => void;
	hasChanges: () => boolean;
	submit: () => Promise<void>;
	cancel: () => void;
}) {
	const dispatch = useAppDispatch();
	const [busy, setBusy] = React.useState(false);

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setBusy(true);
		await submit();
		setBusy(false);
	}

	function deleteMember() {
		dispatch(
			updateOneSessionRegistration({
				id: registration.id,
				changes: { CurrentSAPIN: null },
			})
		);
	}

	return (
		<Form noValidate validated onSubmit={handleSubmit} className="p-3">
			<Row className="mb-3">
				<Table>
					<thead>
						<tr>
							<th></th>
							<th>SAPIN</th>
							<th>Name</th>
							<th>Email</th>
							<th>Status</th>
							<th></th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<th>Registration:</th>
							<td>{registration.SAPIN}</td>
							<td>{registration.Name}</td>
							<td>{registration.Email}</td>
							<td></td>
							<td></td>
						</tr>
						<tr>
							<th>Member:</th>
							<td>{member.SAPIN}</td>
							<td>{member.Name}</td>
							<td>{member.Email}</td>
							<td>{member.Status}</td>
							<td>
								<Button
									variant="outline-danger"
									className="bi-trash"
									onClick={deleteMember}
								/>
							</td>
						</tr>
					</tbody>
				</Table>
			</Row>
			<Form.Group as={Row} controlId="registration-type" className="mb-3">
				<Col>
					<Form.Label>Registration type:</Form.Label>
				</Col>
				<Col xs={12} md={8}>
					<Form.Control
						tabIndex={-1}
						type="text"
						value={registration.RegType}
						readOnly
						onFocus={(e) => e.target.blur()}
					/>
				</Col>
			</Form.Group>
			<Row>
				<AttendanceInfoEdit
					edited={edited}
					saved={saved}
					onChange={onChange}
				/>
			</Row>
			{hasChanges() && (
				<SubmitCancelRow
					submitLabel={"Update"}
					cancel={cancel}
					busy={busy}
				/>
			)}
		</Form>
	);
}
