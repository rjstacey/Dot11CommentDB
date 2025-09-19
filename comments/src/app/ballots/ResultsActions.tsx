import * as React from "react";
import { Button, Row, Col, Form } from "react-bootstrap";
import { ConfirmModal } from "@common";

import { BallotResults } from "./BallotResults";
import { useAppDispatch } from "@/store/hooks";
import { importResults, uploadResults, deleteResults } from "@/store/results";
import { getBallotId, Ballot } from "@/store/ballots";

function DeleteResults({
	ballot,
	setBusy,
}: {
	ballot: Ballot;
	setBusy: (busy: boolean) => void;
}) {
	const dispatch = useAppDispatch();

	async function handleDeleteResults() {
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
		<Button variant="light" onClick={handleDeleteResults}>
			Delete
		</Button>
	);
}

function ImportResults({
	ballot,
	setBusy,
}: {
	ballot: Ballot;
	setBusy: (busy: boolean) => void;
}) {
	const dispatch = useAppDispatch();

	async function handleImportResults() {
		setBusy(true);
		await dispatch(importResults(ballot.id));
		setBusy(false);
	}

	if (!ballot.EpollNum) return null;

	return (
		<Button variant="light" onClick={handleImportResults}>
			{(ballot.Results?.TotalReturns ? "Reimport" : "Import") +
				" from ePoll"}
		</Button>
	);
}

function UploadResults({
	ballot,
	setBusy,
}: {
	ballot: Ballot;
	setBusy: (busy: boolean) => void;
}) {
	const dispatch = useAppDispatch();
	const inputRef = React.useRef<HTMLInputElement>(null);
	const [inputValue, setInputValue] = React.useState("");

	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		setInputValue(e.target.value);
		const file = e.target.files?.[0];
		if (!file) return;
		if (ballot.Results?.TotalReturns) {
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
				Upload results
			</Button>
			<input
				ref={inputRef}
				type="file"
				style={{ display: "none" }}
				accept=".csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
				value={inputValue} // necessary otherwise with the same file selected there is no onChange call
				onChange={handleFileChange}
			/>
		</>
	);
}

function ResultsActions({
	ballot,
	setBusy,
	readOnly,
}: {
	ballot: Ballot;
	setBusy: (busy: boolean) => void;
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
						<DeleteResults ballot={ballot} setBusy={setBusy} />
						<ImportResults ballot={ballot} setBusy={setBusy} />
						<UploadResults ballot={ballot} setBusy={setBusy} />
					</Col>
				)}
			</Row>
		</>
	);
}

export default ResultsActions;
