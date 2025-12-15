import React from "react";
import { Row, Col, Form, DropdownButton } from "react-bootstrap";

import { useAppDispatch } from "@/store/hooks";
import {
	votersFromSpreadsheet,
	votersFromMembersSnapshot,
} from "@/store/voters";
import { BallotType, type Ballot } from "@/store/ballots";

import { SubmitCancelRow } from "@/components/SubmitCancelRow";

export function VotersImportForm({
	ballot,
	close,
}: {
	ballot: Ballot;
	close: () => void;
}) {
	const dispatch = useAppDispatch();
	const [busy, setBusy] = React.useState(false);
	const [source, setSource] = React.useState<"members" | "upload">("members");
	const [date, setDate] = React.useState<string>(
		(ballot?.Start || new Date().toISOString()).slice(0, 10)
	);
	const [file, setFile] = React.useState<File | null>(null);
	const formRef = React.useRef<HTMLFormElement>(null);
	const [formValid, setFormValid] = React.useState(false);

	React.useLayoutEffect(() => {
		const formValid = formRef.current?.checkValidity() || false;
		setFormValid(formValid);
	});

	async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setBusy(true);
		await dispatch(
			source === "members"
				? votersFromMembersSnapshot(ballot.id, date)
				: votersFromSpreadsheet(ballot.id, file!)
		);
		setBusy(false);
		close();
	}

	return (
		<Form
			ref={formRef}
			noValidate
			validated
			style={{ width: 410 }}
			onSubmit={onSubmit}
			className="p-3"
		>
			<Row className="mb-3">
				<Col>Create voter pool from...</Col>
			</Row>
			<Row className="d-flex align-items-center mb-3">
				<Col xs={6}>
					<Form.Check
						id="voters-import-source-members"
						checked={source === "members"}
						onChange={() => setSource("members")}
						label="Members snapshot:"
					/>
				</Col>
				<Form.Group as={Col} xs={6} className="position-relative">
					<Form.Control
						key={source} // fixes form validation
						id="voters-import-members-snapshot-date"
						type="date"
						value={date}
						onChange={(e) => setDate(e.target.value)}
						required={source === "members"}
						isInvalid={source === "members" && !date}
					/>
					<Form.Control.Feedback type="invalid" tooltip>
						Enter a date
					</Form.Control.Feedback>
				</Form.Group>
			</Row>
			<Row className="d-flex align-items-center mb-3">
				<Col xs="auto">
					<Form.Check
						id="voters-import-source-upload"
						checked={source === "upload"}
						onChange={() => setSource("upload")}
						label="Upload:"
					/>
				</Col>
				<Form.Group as={Col} className="position-relative">
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
					<Form.Control.Feedback type="invalid" tooltip>
						Select spreadsheet file
					</Form.Control.Feedback>
				</Form.Group>
			</Row>
			<SubmitCancelRow
				submitLabel="Create"
				cancel={close}
				disabled={!formValid}
				busy={busy}
			/>
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
			title={ballot?.Voters ? "Replace voter pool" : "Create voter pool"}
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
