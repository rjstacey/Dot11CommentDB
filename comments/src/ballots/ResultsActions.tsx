import * as React from "react";
import { Button, Row, FieldLeft, ConfirmModal } from "dot11-components";

import { renderResultsSummary } from "./Ballots";
import { useAppDispatch } from "../store/hooks";
import { importResults, uploadResults, deleteResults } from "../store/results";
import { Ballot } from "../store/ballots";

function ResultsActions({
	ballot,
	setBusy,
	readOnly,
}: {
	ballot: Ballot;
	setBusy: (busy: boolean) => void;
	readOnly?: boolean;
}) {
	const dispatch = useAppDispatch();
	const fileRef = React.useRef<HTMLInputElement>(null);
	const [inputValue, setInputValue] = React.useState("");

	async function handleDeleteResults() {
		const ok = await ConfirmModal.show(
			`Are you sure you want to delete results for ${ballot!.BallotID}?`
		);
		if (!ok) return;
		setBusy(true);
		await dispatch(deleteResults(ballot.id as number));
		setBusy(false);
	}

	async function handleImportResults() {
		setBusy(true);
		await dispatch(importResults(ballot.id as number));
		setBusy(false);
	}

	const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = async (
		e
	) => {
		setInputValue(e.target.value);
		const { files } = e.target;
		if (files && files.length > 0) {
			setBusy(true);
			await dispatch(uploadResults(ballot.id, files[0]));
			setBusy(false);
			setInputValue("");
		}
	};

	return (
		<>
			<Row>
				<FieldLeft label="Results:">
					{renderResultsSummary({ rowData: ballot })}
				</FieldLeft>
			</Row>
			{!readOnly && (
				<Row style={{ justifyContent: "flex-start" }}>
					<Button onClick={handleDeleteResults}>Delete</Button>
					{ballot?.EpollNum ? (
						<Button onClick={handleImportResults}>
							{(ballot.Results ? "Reimport" : "Import") +
								" from ePoll"}
						</Button>
					) : null}
					<Button onClick={() => fileRef.current?.click()}>
						Upload results
					</Button>
					<input
						ref={fileRef}
						type="file"
						style={{ display: "none" }}
						accept=".csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
						value={inputValue} // necessary otherwise with the same file selected there is no onChange call
						onChange={handleFileChange}
					/>
				</Row>
			)}
		</>
	);
}

export default ResultsActions;
