import React from "react";
import {
	Row,
	Col,
	Form,
	DropdownButton,
	Button,
	Spinner,
} from "react-bootstrap";

import { useAppDispatch } from "@/store/hooks";
import {
	votersFromSpreadsheet,
	votersFromMembersSnapshot,
} from "@/store/voters";
import { BallotType, type Ballot } from "@/store/ballots";

export function VotersImportForm({
	close,
	ballot,
}: {
	close: () => void;
	ballot: Ballot;
}) {
	const dispatch = useAppDispatch();
	const [source, setSource] = React.useState<"members" | "upload">("members");
	const [date, setDate] = React.useState<string>(
		(ballot?.Start || new Date().toISOString()).slice(0, 10)
	);
	const [file, setFile] = React.useState<File | null>(null);
	const [busy, setBusy] = React.useState(false);
	const formRef = React.useRef<HTMLFormElement>(null);
	const [formValid, setFormValid] = React.useState(false);

	React.useLayoutEffect(() => {
		const isValid = formRef.current?.checkValidity() || false;
		setFormValid(isValid);
	});

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setBusy(true);
		await dispatch(
			source === "members"
				? votersFromMembersSnapshot(ballot!.id, date)
				: votersFromSpreadsheet(ballot!.id, file!)
		);
		setBusy(false);
		close();
	}

	return (
		<Form
			ref={formRef}
			style={{ width: 410 }}
			onSubmit={handleSubmit}
			className="p-3"
		>
			<Row className="mb-3">
				<Col>Create voter pool from...</Col>
			</Row>
			<Row className="d-flex align-items-center mb-5">
				<Col xs={6}>
					<Form.Check
						id="voters-import-source-members"
						checked={source === "members"}
						onChange={() => setSource("members")}
						label="Members snapshot:"
					/>
				</Col>
				<Form.Group as={Col} xs={6}>
					<Form.Control
						id="voters-import-members-snapshot-date"
						type="date"
						value={date}
						onChange={(e) => setDate(e.target.value)}
						isInvalid={source === "members" && !date}
					/>
					<Form.Control.Feedback
						type="invalid"
						className="position-absolute"
					>
						Enter a date
					</Form.Control.Feedback>
				</Form.Group>
			</Row>
			<Row className="d-flex align-items-center mb-5">
				<Col xs="auto">
					<Form.Check
						id="voters-import-source-upload"
						checked={source === "upload"}
						onChange={() => setSource("upload")}
						label="Upload:"
					/>
				</Col>
				<Form.Group as={Col}>
					<Form.Control
						id="voters-import-upload-file"
						type="file"
						accept=".csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
						onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
							setFile(e.target.files ? e.target.files[0] : null)
						}
						required={source === "upload"}
						isInvalid={source === "upload" && !file}
					/>
					<Form.Control.Feedback
						type="invalid"
						className="position-absolute"
					>
						Select spreadsheet file
					</Form.Control.Feedback>
				</Form.Group>
			</Row>
			<Row>
				<Col className="d-flex justify-content-end gap-2">
					<Button variant="secondary" type="button" onClick={close}>
						Cancel
					</Button>
					<Button type="submit" disabled={!formValid}>
						{busy && <Spinner size="sm" className="me-2" />}
						Create
					</Button>
				</Col>
			</Row>
		</Form>
	);
}

function VotersImportButton({ ballot }: { ballot: Ballot | undefined }) {
	const [show, setShow] = React.useState(false);
	const isWgBallot = ballot?.Type === BallotType.WG;

	return (
		<DropdownButton
			variant="light"
			show={show}
			onToggle={() => setShow(!show)}
			title="New voters pool"
			disabled={!isWgBallot}
		>
			{ballot ? (
				<VotersImportForm
					ballot={ballot}
					close={() => setShow(false)}
				/>
			) : null}
		</DropdownButton>
	);
}

export default VotersImportButton;
