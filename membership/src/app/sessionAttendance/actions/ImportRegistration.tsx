import * as React from "react";
import { Form, Row, Col, Button, Spinner, Dropdown } from "react-bootstrap";
import { useAppDispatch } from "@/store/hooks";
import { uploadSessionRegistration } from "@/store/sessionRegistration";

function ImportRegistrationForm({
	groupName,
	sessionNumber,
	close,
}: {
	groupName: string | null;
	sessionNumber: number | null;
	close: () => void;
}) {
	const dispatch = useAppDispatch();

	const [busy, setBusy] = React.useState(false);
	const [file, setFile] = React.useState<File | null>(null);

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		if (!e.currentTarget.checkValidity()) return;
		setBusy(true);
		await dispatch(
			uploadSessionRegistration(groupName!, sessionNumber!, file!)
		);
		setBusy(false);
		close();
	}

	return (
		<Form
			noValidate
			onSubmit={handleSubmit}
			className="ps-4 p-3"
			style={{ width: 350 }}
		>
			<Form.Group as={Row} className="w-100 mb-3">
				<Form.Control
					type="file"
					accept=".csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
					onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
						setFile(e.target.files?.[0] || null)
					}
					isInvalid={!file}
				/>
				<Form.Control.Feedback type="invalid">
					Select spreadsheet file
				</Form.Control.Feedback>
			</Form.Group>
			<Row>
				<Col className="d-flex justify-content-end">
					<Button type="submit">
						{busy && <Spinner animation="border" size="sm" />}
						<span>Upload</span>
					</Button>
				</Col>
			</Row>
		</Form>
	);
}

export function ImportRegistration({
	groupName,
	sessionNumber,
}: {
	groupName: string | null;
	sessionNumber: number | null;
}) {
	const [show, setShow] = React.useState(false);
	return (
		<Dropdown align="end" show={show} onToggle={() => setShow(!show)}>
			<Dropdown.Toggle
				variant="success-outline"
				disabled={!groupName || !sessionNumber}
			>
				{"Import"}
			</Dropdown.Toggle>
			<Dropdown.Menu>
				<ImportRegistrationForm
					groupName={groupName}
					sessionNumber={sessionNumber}
					close={() => setShow(false)}
				/>
			</Dropdown.Menu>
		</Dropdown>
	);
}
