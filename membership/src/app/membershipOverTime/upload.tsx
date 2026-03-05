import { useState } from "react";
import {
	Alert,
	Dropdown,
	Form,
	Button,
	Row,
	Col,
	Spinner,
} from "react-bootstrap";

import { useAppDispatch } from "@/store/hooks";
import { uploadMembershipOverTime } from "@/store/membershipOverTime";

function MembershipOverTimeUploadForm({ close }: { close: () => void }) {
	const dispatch = useAppDispatch();
	const [file, setFile] = useState<File | null>(null);
	const [busy, setBusy] = useState(false);

	async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
		e.preventDefault();
		if (!file) return;
		setBusy(true);
		await dispatch(uploadMembershipOverTime(file));
		setBusy(false);
		close();
	}

	return (
		<Form noValidate onSubmit={handleSubmit} className="p-3">
			<Alert variant="warning">
				<span className="fw-bold">
					Upload will replace existing data
				</span>
			</Alert>
			<Form.Group as={Row} controlId="fileInput" className="mb-3">
				<Form.Label column xs="auto">
					Spreadsheet:
				</Form.Label>
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
			<Form.Group as={Row} controlId="submit" className="mb-3">
				<Col className="d-flex justify-content-end">
					<Button type="submit">
						{busy && <Spinner animation="border" size="sm" />}
						<span>Upload</span>
					</Button>
				</Col>
			</Form.Group>
		</Form>
	);
}

export function MembershipOverTimeUpload() {
	const [show, setShow] = useState(false);
	return (
		<Dropdown align="end" show={show} onToggle={() => setShow(!show)}>
			<Dropdown.Toggle variant="success-outline">Upload</Dropdown.Toggle>
			<Dropdown.Menu style={{ minWidth: "400px" }}>
				<MembershipOverTimeUploadForm close={() => setShow(false)} />
			</Dropdown.Menu>
		</Dropdown>
	);
}
