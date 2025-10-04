import * as React from "react";
import { Dropdown, Form, Button, Row, Col, Spinner } from "react-bootstrap";

import { useAppDispatch } from "@/store/hooks";
import { uploadMembers, UploadFormat } from "@/store/members";

function MembersUploadForm({ close }: { close: () => void }) {
	const dispatch = useAppDispatch();
	const [file, setFile] = React.useState<File | null>(null);
	const [format, setFormat] = React.useState(UploadFormat.Roster);
	const [busy, setBusy] = React.useState(false);

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		if (!file) return;
		setBusy(true);
		await dispatch(uploadMembers(format, file));
		setBusy(false);
		close();
	}

	const changeFormat: React.ChangeEventHandler<HTMLInputElement> = (e) =>
		setFormat(e.target.value);

	return (
		<Form noValidate onSubmit={handleSubmit} className="p-3">
			<Form.Group as={Row} className="mb-3">
				<Form.Label as="span">Import:</Form.Label>
				<Col sm={12}>
					<Form.Check
						type="radio"
						title="Import members from MyProject roster"
						value={UploadFormat.Roster}
						checked={format === UploadFormat.Roster}
						onChange={changeFormat}
						label="Members from MyProject roster"
					/>
					<Form.Check
						type="radio"
						title="Import members (replaces existing)"
						value={UploadFormat.Members}
						checked={format === UploadFormat.Members}
						onChange={changeFormat}
						label="Members from Access database"
					/>
					<Form.Check
						type="radio"
						title="Import member SAPINs (replaces existing)"
						value={UploadFormat.SAPINs}
						checked={format === UploadFormat.SAPINs}
						onChange={changeFormat}
						label="Member SAPINs from Access database"
					/>
					<Form.Check
						type="radio"
						title="Import member email addresses (replaces existing)"
						value={UploadFormat.Emails}
						checked={format === UploadFormat.Emails}
						onChange={changeFormat}
						label="Member email addresses from Access database"
					/>
					<Form.Check
						type="radio"
						title="Import member history (replaces existing)"
						value={UploadFormat.History}
						checked={format === UploadFormat.History}
						onChange={changeFormat}
						label="Member history from Access database"
					/>
				</Col>
			</Form.Group>
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

export function MembersUpload() {
	const [show, setShow] = React.useState(false);
	return (
		<Dropdown align="end" show={show} onToggle={() => setShow(!show)}>
			<Dropdown.Toggle variant="success-outline">
				Upload Members
			</Dropdown.Toggle>
			<Dropdown.Menu style={{ minWidth: "400px" }}>
				<MembersUploadForm close={() => setShow(false)} />
			</Dropdown.Menu>
		</Dropdown>
	);
}
