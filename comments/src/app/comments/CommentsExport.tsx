import * as React from "react";
import {
	DropdownButton,
	Form,
	Row,
	Col,
	Button,
	Spinner,
} from "react-bootstrap";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
	exportCommentsSpreadsheet,
	CommentsExportFormat,
	CommentsExportStyle,
	selectCommentsBallot_id,
} from "@/store/comments";
import { getBallotId, Ballot, selectBallot } from "@/store/ballots";

const spreadsheetFormatOptions: {
	value: CommentsExportFormat;
	label: string;
	description: string;
}[] = [
	{
		value: "modern",
		label: "Modern spreadsheet",
		description: "Modern format",
	},
	{
		value: "legacy",
		label: "Legacy spreadsheet",
		description: "Legacy format; compatible APS Comments Access Database.",
	},
	{
		value: "myproject",
		label: "All resolved comments for MyProject upload",
		description:
			"Export appoved resolutions for MyProject upload. Modifies an existing MyProject comment spreadsheet.",
	},
];

function SpreadsheetFormatSelect({
	value,
	setValue,
}: {
	value: CommentsExportFormat;
	setValue: (value: CommentsExportFormat) => void;
}) {
	return (
		<>
			<Form.Label as="span">Spreadsheet format:</Form.Label>
			{spreadsheetFormatOptions.map((a) => (
				<Form.Check
					key={a.value}
					type="radio"
					id={"spreadsheet-format-" + a.value}
					title={a.description}
					value={a.value}
					checked={value === a.value}
					onChange={() => setValue(a.value)}
					label={a.label}
				/>
			))}
		</>
	);
}

const spreadsheetStyleOptions: {
	value: CommentsExportStyle;
	label: string;
	description: string;
}[] = [
	{ value: "AllComments", label: "All comments", description: "Match CID" },
	{
		value: "TabPerAdHoc",
		label: "All comments plus one sheet per ad-hoc",
		description:
			"Export all comments plus a sheet for each ad-hoc. Optionally updates existing spreadsheet.",
	},
	{
		value: "TabPerCommentGroup",
		label: "All comments plus one sheet per comment group",
		description: "All comments plus one sheet per comment group",
	},
];

function SpreadsheetStyleSelect({
	value,
	setValue,
}: {
	value: CommentsExportStyle;
	setValue: (value: CommentsExportStyle) => void;
}) {
	return (
		<>
			<Form.Label as="span">Spreadsheet style:</Form.Label>
			{spreadsheetStyleOptions.map((a) => (
				<Form.Check
					key={a.value}
					type="radio"
					id={"spreadsheet-style-" + a.value}
					title={a.description}
					value={a.value}
					checked={value === a.value}
					onChange={() => setValue(a.value)}
					label={a.label}
				/>
			))}
		</>
	);
}
function CommentsExportDropdown({
	ballot,
	close,
}: {
	ballot: Ballot;
	close: () => void;
}) {
	const dispatch = useAppDispatch();

	const [format, setFormat] = React.useState<CommentsExportFormat>("modern");
	const [style, setStyle] =
		React.useState<CommentsExportStyle>("AllComments");
	const [file, setFile] = React.useState<File | null>(null);
	const [appendSheets, setAppendSheets] = React.useState<boolean>(false);
	const [busy, setBusy] = React.useState(false);

	let errorText: string | undefined;
	if (format === "myproject" && !file)
		errorText = "Select MyProject comment spreadsheet file";

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (errorText) return;

		setBusy(true);
		await dispatch(
			exportCommentsSpreadsheet(
				ballot.id,
				format,
				style,
				file || undefined,
				appendSheets
			)
		);
		setBusy(false);
		close();
	}

	const title = (
		<span>
			Export comments for {getBallotId(ballot)} to Excel spreadsheet
		</span>
	);

	return (
		<Form style={{ width: 450 }} onSubmit={handleSubmit} className="p-3">
			<Row className="mb-2">{title}</Row>
			<Row className="mb-2">
				<Col>
					<SpreadsheetFormatSelect
						value={format}
						setValue={setFormat}
					/>
				</Col>
			</Row>
			<Row className="mb-2">
				<Col>
					<SpreadsheetStyleSelect value={style} setValue={setStyle} />
				</Col>
			</Row>
			<Form.Group as={Row} controlId="spreadsheet-file" className="mb-2">
				<Form.Label>Spreadsheet file:</Form.Label>
				<Col>
					<Form.Control
						type="file"
						accept=".csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
						onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
							setFile(e.target.files ? e.target.files[0] : null)
						}
						isInvalid={format === "myproject" ? !file : undefined}
					/>
					<Form.Control.Feedback type="invalid">
						Select a spreadsheet file to update
					</Form.Control.Feedback>
					{format !== "myproject" && (
						<Form.Text>
							Optionally select a spreadsheet file to update
						</Form.Text>
					)}
				</Col>
			</Form.Group>
			{file && format === "modern" && (
				<Form.Group as={Row}>
					<Form.Check
						type="radio"
						id="append-sheets-false"
						title='Delete sheets (except for the "Title" and "Revision History" sheets).'
						checked={!appendSheets}
						onChange={() => setAppendSheets(false)}
						label="Replace sheets (except Title and Revision History"
					/>
					<Form.Check
						type="radio"
						id="append-sheets-true"
						title="Replace existing sheets with same name or append as new sheets."
						checked={Boolean(appendSheets)}
						onChange={() => setAppendSheets(true)}
						label="Append as new sheets"
					/>
				</Form.Group>
			)}
			<Row>
				<Col className="d-flex justify-content-end">
					<Button type="submit">
						{busy && <Spinner size="sm" className="me-2" />}
						Export
					</Button>
				</Col>
			</Row>
		</Form>
	);
}

function CommentsExport({ disabled }: { disabled?: boolean }) {
	const [show, setShow] = React.useState(false);
	const ballot_id = useAppSelector(selectCommentsBallot_id);
	const ballot = useAppSelector((state) =>
		ballot_id ? selectBallot(state, ballot_id) : undefined
	);
	return (
		<DropdownButton
			variant="light"
			show={show}
			onToggle={() => setShow(!show)}
			disabled={disabled}
			title="Export to file"
		>
			<CommentsExportDropdown
				ballot={ballot!}
				close={() => setShow(false)}
			/>
		</DropdownButton>
	);
}

export default CommentsExport;
