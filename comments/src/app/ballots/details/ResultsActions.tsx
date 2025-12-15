import * as React from "react";
import { Button, Row, Col, Form, Spinner } from "react-bootstrap";
import { ConfirmModal } from "@common";

import { BallotResults } from "../BallotResults";
import { useAppDispatch } from "@/store/hooks";
import { importResults, uploadResults, deleteResults } from "@/store/results";
import { getBallotId, Ballot } from "@/store/ballots";

function DeleteResults({ ballot }: { ballot: Ballot }) {
	const dispatch = useAppDispatch();
	const [busy, setBusy] = React.useState(false);

	async function onClick() {
		const ok = await ConfirmModal.show(
			`Are you sure you want to delete results for ${getBallotId(
				ballot
			)}?`
		);
		if (!ok) return;
		setBusy(true);
		await dispatch(deleteResults(ballot.id as number));
		setBusy(false);
	}

	return (
		<Button variant="light" onClick={onClick}>
			<Spinner size="sm" hidden={!busy} className="me-2" />
			{"Delete"}
		</Button>
	);
}

function ImportResults({ ballot }: { ballot: Ballot }) {
	const dispatch = useAppDispatch();
	const [busy, setBusy] = React.useState(false);
	const isReimport = Boolean(ballot.Results?.TotalReturns);

	async function onClick() {
		if (isReimport) {
			const ok = await ConfirmModal.show(
				"Are you sure you want to replace the existing results?"
			);
			if (!ok) return;
		}
		setBusy(true);
		await dispatch(importResults(ballot.id));
		setBusy(false);
	}

	if (!ballot.EpollNum) return null;

	return (
		<Button variant="light" onClick={onClick}>
			<Spinner size="sm" hidden={!busy} className="me-2" />
			{(isReimport ? "Reimport" : "Import") + " from ePoll"}
		</Button>
	);
}

function UploadResults({ ballot }: { ballot: Ballot }) {
	const dispatch = useAppDispatch();
	const [busy, setBusy] = React.useState(false);
	const inputRef = React.useRef<HTMLInputElement>(null);
	const [inputValue, setInputValue] = React.useState("");
	const isReimport = Boolean(ballot.Results?.TotalReturns);

	const onChangeFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
		setInputValue(e.target.value);
		const file = e.target.files?.[0];
		if (!file) return;
		if (isReimport) {
			const ok = await ConfirmModal.show(
				"Are you sure you want to replace the existing results?"
			);
			if (!ok) return;
		}
		setBusy(true);
		await dispatch(uploadResults(ballot.id, file));
		setBusy(false);
		setInputValue("");
	};

	return (
		<>
			<Button variant="light" onClick={() => inputRef.current?.click()}>
				<Spinner size="sm" hidden={!busy} className="me-2" />
				{"Upload results"}
			</Button>
			<input
				ref={inputRef}
				type="file"
				style={{ display: "none" }}
				accept=".csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
				value={inputValue} // necessary otherwise with the same file selected there is no onChange call
				onChange={onChangeFile}
			/>
		</>
	);
}

function ResultsActions({
	ballot,
	readOnly,
}: {
	ballot: Ballot;
	readOnly?: boolean;
}) {
	return (
		<>
			<Row className="align-items-center mb-2">
				<Form.Label as="span" column xs="auto">
					Results:
				</Form.Label>
				<Col xs="auto">
					<BallotResults ballot={ballot} />
				</Col>
				{!readOnly && (
					<Col
						xs={12}
						className="d-flex flex-row flex-wrap justify-content-start gap-2"
					>
						<DeleteResults ballot={ballot} />
						<ImportResults ballot={ballot} />
						<UploadResults ballot={ballot} />
					</Col>
				)}
			</Row>
		</>
	);
}

export default ResultsActions;
