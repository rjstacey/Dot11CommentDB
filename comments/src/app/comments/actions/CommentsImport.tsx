import * as React from "react";
import {
	Row,
	Col,
	Form,
	DropdownButton,
	Spinner,
	Button,
} from "react-bootstrap";
import { ConfirmModal } from "@common";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
	type FieldToUpdate,
	type MatchAlgo,
	type MatchUpdate,
	selectCommentsBallot_id,
	uploadResolutions,
} from "@/store/comments";
import { getBallotId, Ballot, selectBallot } from "@/store/ballots";

const importFieldOptions: {
	value: FieldToUpdate;
	label: string;
	description: string;
}[] = [
	{ value: "cid", label: "CID", description: "Update CID of each comment" },
	{
		value: "clausepage",
		label: "Clause & Page",
		description:
			"Update Clause, Page and Line fields of each comment. Original fields as commented are preserved.",
	},
	{
		value: "adhoc",
		label: "Ad-hoc, Comment Group, Notes",
		description:
			"Update Owning Ad-hoc, Comment Group and Notes field of each comment",
	},
	{
		value: "assignee",
		label: "Assignee",
		description: "Update Assignee field of each comment",
	},
	{
		value: "resolution",
		label: "Resolutions",
		description:
			"Update Submission, Resn Status, Resolution and Motion Number fields of each comment",
	},
	{
		value: "editing",
		label: "Editing status",
		description:
			"Update Edit Status, Edit Notes and Edited in Draft fields for each comment",
	},
];

function ImportFieldsList({
	fields,
	setFields,
	disableCID,
}: {
	fields: FieldToUpdate[];
	setFields: (fields: FieldToUpdate[]) => void;
	disableCID: boolean;
}) {
	const change: React.ChangeEventHandler<HTMLInputElement> = (e) => {
		const newFields = fields.slice();
		if (e.target.checked) {
			newFields.push(e.target.name as FieldToUpdate);
		} else {
			const i = newFields.indexOf(e.target.name as FieldToUpdate);
			if (i >= 0) newFields.splice(i, 1);
		}
		setFields(newFields);
	};

	return (
		<>
			<Form.Label as="span">Fields to import:</Form.Label>
			{importFieldOptions.map((a) => (
				<Form.Check
					key={a.value}
					id={"import-field-" + a.value}
					name={a.value}
					title={a.description}
					checked={fields.includes(a.value)}
					onChange={change}
					disabled={a.value === "cid" && disableCID}
					label={a.label}
				/>
			))}
			<Form.Text>
				Selected fields are overwritten. Unselected fields are retained.
			</Form.Text>
			<Form.Text
				className="text-danger d-block"
				style={{
					visibility: fields.length === 0 ? "visible" : "hidden",
				}}
			>
				Select at least one field to import
			</Form.Text>
		</>
	);
}

const matchAlgoOptions: {
	value: MatchAlgo;
	label: string;
	description: string;
}[] = [
	{ value: "cid", label: "Match CID", description: "Match CID" },
	{
		value: "comment",
		label: "Match comment",
		description:
			"Match Commenter, Category, Page, Line, Comment and Proposed Change",
	},
	{
		value: "elimination",
		label: "Successive elimination",
		description:
			"Successively eliminate rows that do not match until only one row is left by matching, in order, Commenter, Category, Page, " +
			"Line, Comment and Proposed Change. Fields that might have issues are only matched if needed.",
	},
];

function MatchAlgoList({
	algo,
	setAlgo,
}: {
	algo: MatchAlgo;
	setAlgo: (algo: MatchAlgo) => void;
}) {
	return (
		<>
			<Form.Label as="span">Match algorithm:</Form.Label>
			{matchAlgoOptions.map((a) => (
				<Form.Check
					key={a.value}
					type="radio"
					id={"match-algo-" + a.value}
					title={a.description}
					value={a.value}
					checked={algo === a.value}
					onChange={() => setAlgo(a.value)}
					label={a.label}
				/>
			))}
		</>
	);
}

const matchUpdateOptions: {
	value: MatchUpdate;
	label: string;
	description: string;
}[] = [
	{
		value: "all",
		label: "All comments",
		description: "Update all comments provided all comments match.",
	},
	{
		value: "any",
		label: "Any comments that match",
		description:
			"Update comments that match, ignore comments that don't match.",
	},
	{
		value: "add",
		label: "Add comments that don't match any existing comments",
		description:
			"Update all comments and add extra comments provided all existing comments match",
	},
];

function MatchUpdateList({
	matchUpdate,
	setMatchUpdate,
}: {
	matchUpdate: MatchUpdate;
	setMatchUpdate: (matchUpdate: MatchUpdate) => void;
}) {
	return (
		<>
			<Form.Label as="span">Update scope:</Form.Label>
			{matchUpdateOptions.map((a) => (
				<Form.Check
					key={a.value}
					type="radio"
					id={"match-update-" + a.value}
					title={a.description}
					value={a.value}
					checked={matchUpdate === a.value}
					onChange={() => setMatchUpdate(a.value)}
					label={a.label}
				/>
			))}
		</>
	);
}

function CommentsImportDropdown({
	ballot,
	close,
}: {
	ballot: Ballot;
	close: () => void;
}) {
	const dispatch = useAppDispatch();
	const [fields, setFields] = React.useState<FieldToUpdate[]>([]);
	const [algo, setAlgo] = React.useState<MatchAlgo>("cid");
	const [matchUpdate, setMatchUpdate] = React.useState<MatchUpdate>("all");
	const [file, setFile] = React.useState<File | null>(null);
	const [sheetName, setSheetName] = React.useState("All Comments");
	const [busy, setBusy] = React.useState(false);

	const formValid = fields.length > 0 && file !== null;

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		if (!file) return;
		setBusy(true);
		const result = await dispatch(
			uploadResolutions(
				ballot.id,
				fields,
				algo,
				matchUpdate,
				sheetName,
				file
			)
		);
		setBusy(false);
		close();
		if (result) {
			const { matched, unmatched, added, remaining, updated } = result;
			let msg = "";
			if (matchUpdate === "all") {
				if (unmatched.length === 0) {
					msg =
						updated === 0
							? "No comments were updated (no changes identified)."
							: matched.length === updated
								? "All comments updated."
								: `${updated} comments were updated.`;
				} else {
					msg =
						(unmatched.length === 1
							? `1 comment did not match:\n`
							: `${unmatched.length} comments did not match:\n`) +
						unmatched.join(", ");
				}
			} else if (matchUpdate === "any") {
				msg =
					updated === 0
						? "No comments were updated."
						: updated === 1
							? "1 comment was updated."
							: `${updated} comments were updated.`;
			} else {
				msg =
					added.length === 0
						? "No comments were added."
						: (added.length === 1
								? `1 comment was added:\n`
								: `${added.length} comments were added:\n`) +
							added.join(", ");
			}
			if (remaining.length > 0) {
				msg +=
					`\n${remaining.length} comments in spreadsheet were not matched:\n` +
					remaining.join(", ") +
					"\n";
			}
			await ConfirmModal.show(msg, false);
		}
	}

	const handleSetAlgo = (algo: MatchAlgo) => {
		if (algo === "cid" && fields.includes("cid")) {
			const newFields = fields.filter((f) => f !== "cid");
			setFields(newFields);
		}
		setAlgo(algo);
	};

	const title = (
		<span>
			Import fields for {getBallotId(ballot)} from Excel spreadsheet
		</span>
	);

	return (
		<Form style={{ width: 600 }} onSubmit={handleSubmit} className="p-3">
			<Row className="mb-2">{title}</Row>
			<Row className="mb-2">
				<Col>
					<ImportFieldsList
						fields={fields}
						setFields={setFields}
						disableCID={algo === "cid"}
					/>
				</Col>
				<Col>
					<Row className="mb-2">
						<MatchAlgoList algo={algo} setAlgo={handleSetAlgo} />
					</Row>
					<Row>
						<MatchUpdateList
							matchUpdate={matchUpdate}
							setMatchUpdate={setMatchUpdate}
						/>
					</Row>
				</Col>
			</Row>
			<Form.Group as={Row} controlId="spreadsheet-file" className="mb-2">
				<Form.Label column xs={4}>
					Spreadsheet file:
				</Form.Label>
				<Col>
					<Form.Control
						type="file"
						accept=".csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
						onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
							setFile(e.target.files ? e.target.files[0] : null)
						}
						isInvalid={!file}
					/>
					<Form.Control.Feedback type="invalid">
						Select a spreadsheet file
					</Form.Control.Feedback>
				</Col>
			</Form.Group>
			<Form.Group as={Row} controlId="worksheet-name" className="mb-2">
				<Form.Label column xs={4}>
					Worksheet name:
				</Form.Label>
				<Col>
					<Form.Control
						type="text"
						value={sheetName}
						onChange={(e) => setSheetName(e.target.value)}
					/>
				</Col>
			</Form.Group>
			<Row>
				<Col className="d-flex justify-content-end">
					<Button type="submit" disabled={!formValid || busy}>
						<Spinner size="sm" className="me-2" hidden={!busy} />
						{"Upload"}
					</Button>
				</Col>
			</Row>
		</Form>
	);
}

function CommentsImport({ disabled }: { disabled?: boolean }) {
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
			disabled={!ballot || disabled}
			title="Upload resolutions"
		>
			<CommentsImportDropdown
				ballot={ballot!}
				close={() => setShow(false)}
			/>
		</DropdownButton>
	);
}

export default CommentsImport;
