import { Row, Col, Table, Form } from "react-bootstrap";
import { IeeeMemberSelector } from "@/components/IeeeMemberSelector";

import {
	updateOneSessionRegistration,
	type SessionRegistration,
} from "@/store/sessionRegistration";
import { useAppDispatch } from "@/store/hooks";

export function RegistrationUnmatchedForm({
	registration,
}: {
	registration: SessionRegistration;
}) {
	const dispatch = useAppDispatch();

	return (
		<Form noValidate validated className="p-3">
			<Row>
				<Table>
					<thead>
						<tr>
							<th></th>
							<th>SAPIN</th>
							<th>Name</th>
							<th>Email</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<th>Registration:</th>
							<td>{registration.SAPIN}</td>
							<td>{registration.Name}</td>
							<td>{registration.Email}</td>
						</tr>
					</tbody>
				</Table>
			</Row>
			<Form.Group as={Row} controlId="registration-type" className="mb-3">
				<Col>
					<Form.Label>Member:</Form.Label>
				</Col>
				<Col xs={12} md={8}>
					<IeeeMemberSelector
						value={registration.SAPIN || 0}
						onChange={(sapin) =>
							dispatch(
								updateOneSessionRegistration({
									id: registration.id,
									changes: { SAPIN: sapin },
								}),
							)
						}
						showAll
					/>
				</Col>
			</Form.Group>
		</Form>
	);
}
