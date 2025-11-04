import * as React from "react";
import {
	Form,
	Row,
	Col,
	Button,
	Spinner,
	DropdownButton,
} from "react-bootstrap";
import { useAppDispatch } from "@/store/hooks";
import { uploadSessionRegistration } from "@/store/sessionRegistration";

function ImportRegistrationForm({
	groupName,
	sessionNumber,
	close,
}: {
	groupName: string;
	sessionNumber: number;
	close: () => void;
}) {
	const dispatch = useAppDispatch();
	const [busy, setBusy] = React.useState(false);
	const [file, setFile] = React.useState<File | null>(null);

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setBusy(true);
		await dispatch(
			uploadSessionRegistration(groupName, sessionNumber, file!)
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
					<Button type="submit" disabled={!file || busy}>
						<Spinner size="sm" hidden={!busy} className="me-2" />
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
	groupName: string;
	sessionNumber: number;
}) {
	const [show, setShow] = React.useState(false);
	return (
		<DropdownButton
			variant="success-outline"
			align="end"
			show={show}
			onToggle={() => setShow(!show)}
			title={"Import"}
		>
			<ImportRegistrationForm
				groupName={groupName}
				sessionNumber={sessionNumber}
				close={() => setShow(false)}
			/>
		</DropdownButton>
	);
}
