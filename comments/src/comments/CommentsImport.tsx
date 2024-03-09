import * as React from "react";

import {
	Form,
	Row,
	Col,
	List,
	ListItem,
	Field,
	Checkbox,
	ActionButtonDropdown,
	ConfirmModal,
	DropdownRendererProps,
} from "dot11-components";

import { useAppDispatch } from "../store/hooks";
import { uploadResolutions } from "../store/comments";
import type { FieldToUpdate, MatchAlgo, MatchUpdate } from "../store/comments";
import { getBallotId, Ballot } from "../store/ballots";

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

const ImportFieldsList = ({
	fields,
	setFields,
	disableCID,
}: {
	fields: FieldToUpdate[];
	setFields: (fields: FieldToUpdate[]) => void;
	disableCID: boolean;
}) => {
	const changeImportFields: React.ChangeEventHandler<HTMLInputElement> = (
		e
	) => {
		const newFields = fields.slice();
		if (e.target.checked) {
			newFields.push(e.target.value as FieldToUpdate);
		} else {
			const i = newFields.indexOf(e.target.value as FieldToUpdate);
			if (i >= 0) newFields.splice(i, 1);
		}
		setFields(newFields);
	};
	return (
		<List label="Import fields (selected fields will be overwritten):">
			{importFieldOptions.map((a) => (
				<ListItem key={a.value}>
					<Checkbox
						value={a.value}
						title={a.description}
						checked={fields.includes(a.value)}
						onChange={changeImportFields}
						disabled={a.value === "cid" && disableCID}
					/>
					<label>{a.label}</label>
				</ListItem>
			))}
		</List>
	);
};

const MatchAlgoList = ({
	algo,
	setAlgo,
}: {
	algo: MatchAlgo;
	setAlgo: (algo: MatchAlgo) => void;
}) => (
	<List label="Match algorithm:">
		{matchAlgoOptions.map((a) => (
			<ListItem key={a.value}>
				<input
					type="radio"
					title={a.description}
					value={a.value}
					checked={algo === a.value}
					onChange={(e) => setAlgo(e.target.value as MatchAlgo)}
				/>
				<label>{a.label}</label>
			</ListItem>
		))}
	</List>
);

const UpdateList = ({
	matchUpdate,
	setMatchUpdate,
}: {
	matchUpdate: MatchUpdate;
	setMatchUpdate: (matchUpdate: MatchUpdate) => void;
}) => (
	<List label="Update scope:">
		{matchUpdateOptions.map((a) => (
			<ListItem key={a.value}>
				<input
					type="radio"
					title={a.description}
					value={a.value}
					checked={matchUpdate === a.value}
					onChange={(e) =>
						setMatchUpdate(e.target.value as MatchUpdate)
					}
				/>
				<label>{a.label}</label>
			</ListItem>
		))}
	</List>
);

function CommentsImportDropdown({
	ballot,
	methods,
}: {
	ballot: Ballot;
} & DropdownRendererProps) {
	const dispatch = useAppDispatch();
	const fileRef = React.useRef<HTMLInputElement>(null);
	const [fields, setFields] = React.useState<FieldToUpdate[]>([]);
	const [algo, setAlgo] = React.useState<MatchAlgo>("cid");
	const [matchUpdate, setMatchUpdate] = React.useState<MatchUpdate>("all");
	const [sheetName, setSheetName] = React.useState("All Comments");
	const [errMsg, setErrMsg] = React.useState("");
	const [busy, setBusy] = React.useState(false);

	async function submit() {
		const file = fileRef.current?.files![0];
		if (!file) {
			setErrMsg("Select spreadsheet file");
			return;
		}
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
		methods.close();
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

	return (
		<Form
			style={{ width: 600 }}
			title={`Import fields for ${getBallotId(ballot)} from Excel spreadsheet`}
			errorText={errMsg}
			submit={submit}
			cancel={methods.close}
			busy={busy}
		>
			<Row>
				<Col>
					<ImportFieldsList
						fields={fields}
						setFields={setFields}
						disableCID={algo === "cid"}
					/>
				</Col>
				<Col>
					<Row>
						<MatchAlgoList algo={algo} setAlgo={handleSetAlgo} />
					</Row>
					<Row>
						<UpdateList
							matchUpdate={matchUpdate}
							setMatchUpdate={setMatchUpdate}
						/>
					</Row>
				</Col>
			</Row>
			<Row>
				<Field
					label="Spreadsheet file:"
					style={{ justifyContent: "left" }}
				>
					<input
						type="file"
						accept=".csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
						ref={fileRef}
						onClick={(e) => setErrMsg("")}
					/>
				</Field>
			</Row>
			<Row>
				<Field
					label="Worksheet name:"
					style={{ justifyContent: "left" }}
				>
					<input
						type="text"
						value={sheetName}
						onChange={(e) => setSheetName(e.target.value)}
					/>
				</Field>
			</Row>
		</Form>
	);
}

function CommentsImport({
	ballot,
	disabled,
}: {
	ballot?: Ballot;
	disabled?: boolean;
}) {
	return (
		<ActionButtonDropdown
			name="import"
			title="Upload resolutions"
			disabled={!ballot || disabled}
			dropdownRenderer={(props) => (
				<CommentsImportDropdown ballot={ballot!} {...props} />
			)}
		/>
	);
}

export default CommentsImport;
