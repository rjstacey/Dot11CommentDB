import * as React from "react";
import { Dropdown, Form, Button, Row, Col, Spinner } from "react-bootstrap";

import { useAppDispatch } from "@/store/hooks";
import { updateMyProjectRoster } from "@/store/myProjectRoster";

function RosterUpdateForm({ close }: { close: () => void }) {
	const dispatch = useAppDispatch();
	const [removeUnchanged, setRemoveUnchanged] = React.useState(true);
	const [appendNew, setAppendNew] = React.useState(false);
	const [file, setFile] = React.useState<File | null>(null);
	const [busy, setBusy] = React.useState(false);

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		if (!file) return;
		setBusy(true);
		await dispatch(
			updateMyProjectRoster(file!, { removeUnchanged, appendNew })
		);
		setBusy(false);
		close();
	}

	return (
		<Form noValidate validated onSubmit={handleSubmit} className="p-3">
			<p>
				{
					'Take the roster as exported by MyProject and update the "Involvement Level" column to reflect member status.'
				}
			</p>
			<Form.Group
				as={Row}
				controlId="removeUnchanged"
				className="mb-3 align-items-center"
			>
				<Form.Label column sm={10}>
					Remove rows with no change:
				</Form.Label>
				<Col sm={2}>
					<Form.Check
						checked={removeUnchanged}
						onChange={(e) => setRemoveUnchanged(e.target.checked)}
					/>
				</Col>
			</Form.Group>
			<Form.Group as={Row} controlId="appendNew" className="mb-3">
				<Form.Label column sm={10}>
					Append new members:
				</Form.Label>
				<Col sm={2}>
					<Form.Check
						checked={appendNew}
						onChange={(e) => setAppendNew(e.target.checked)}
					/>
				</Col>
			</Form.Group>
			<Form.Group as={Row} controlId="fileInput" className="mb-3">
				<Form.Label>MyProject roster spreadsheet:</Form.Label>
				<Col sm={12}>
					<Form.Control
						type="file"
						accept=".csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
						onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
							setFile(e.target.files ? e.target.files[0] : null)
						}
						required
						isInvalid={!file}
					/>
					<Form.Control.Feedback type="invalid">
						Select spreadsheet file
					</Form.Control.Feedback>
				</Col>
			</Form.Group>
			<Row>
				<Col className="d-flex justify-content-end">
					<Button type="submit">
						{busy && <Spinner animation="border" size="sm" />}
						<span>Update</span>
					</Button>
				</Col>
			</Row>
		</Form>
	);
}

export function MembersRoster() {
	const [show, setShow] = React.useState(false);
	return (
		<Dropdown align="end" show={show} onToggle={() => setShow(!show)}>
			<Dropdown.Toggle variant="success-outline">
				Update Roster
			</Dropdown.Toggle>
			<Dropdown.Menu style={{ minWidth: "300px" }}>
				<RosterUpdateForm close={() => setShow(false)} />
			</Dropdown.Menu>
		</Dropdown>
	);
}
