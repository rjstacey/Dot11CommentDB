import * as React from "react";

import {
	Form,
	Row,
	List,
	ListItem,
	ActionButtonDropdown,
	DropdownRendererProps,
} from "dot11-components";

import { useAppDispatch } from "@/store/hooks";
import {
	exportCommentsSpreadsheet,
	CommentsExportFormat,
	CommentsExportStyle,
} from "@/store/comments";
import { getBallotId, Ballot } from "@/store/ballots";

function CommentsExportDropdown({
	ballot,
	methods,
}: {
	ballot: Ballot;
} & DropdownRendererProps) {
	const dispatch = useAppDispatch();

	const [format, setFormat] = React.useState<CommentsExportFormat>("modern");
	const [style, setStyle] =
		React.useState<CommentsExportStyle>("AllComments");
	const [file, setFile] = React.useState<File | undefined>();
	const [appendSheets, setAppendSheets] = React.useState<boolean>(false);
	const [busy, setBusy] = React.useState(false);

	let title =
		"Export comments for " + getBallotId(ballot) + " to Excel spreadsheet";
	let errorText: string | undefined;
	if (format === "myproject" && !file)
		errorText = "Select MyProject comment spreadsheet file";

	async function submit() {
		if (errorText) return;

		setBusy(true);
		await dispatch(
			exportCommentsSpreadsheet(
				ballot.id,
				format,
				style,
				file,
				appendSheets
			)
		);
		setBusy(false);
		methods.close();
	}

	return (
		<Form
			style={{ width: 450 }}
			title={title}
			errorText={errorText}
			submit={submit}
			cancel={methods.close}
			busy={busy}
		>
			<Row>
				<List label="Spreadsheet format:">
					<ListItem>
						<input
							type="radio"
							id="modern"
							title={"Modern format"}
							checked={format === "modern"}
							onChange={(e) => setFormat("modern")}
						/>
						<label htmlFor="modern">Modern spreadsheet</label>
					</ListItem>
					<ListItem>
						<input
							type="radio"
							id="legacy"
							title={
								"Legacy format; compatible APS Comments Access Database."
							}
							checked={format === "legacy"}
							onChange={(e) => setFormat("legacy")}
						/>
						<label htmlFor="legacy">Legacy spreadsheet</label>
					</ListItem>
					<ListItem>
						<input
							type="radio"
							id="myproject"
							title="Export appoved resolutions for MyProject upload. Modifies an existing MyProject comment spreadsheet."
							checked={format === "myproject"}
							onChange={(e) => setFormat("myproject")}
						/>
						<label htmlFor="myproject">
							All resolved comments for MyProject upload
						</label>
					</ListItem>
				</List>
			</Row>
			<Row>
				<List label="Spreadsheet style:">
					<ListItem>
						<input
							type="radio"
							id="AllComments"
							title="Export all comments. Optionally updates existing spreadsheet."
							checked={style === "AllComments"}
							onChange={(e) => setStyle("AllComments")}
						/>
						<label htmlFor={"AllComments"}>All comments</label>
					</ListItem>
					<ListItem>
						<input
							type="radio"
							id="TabPerAdHoc"
							title="Export all comments plus a sheet for each ad-hoc. Optionally updates existing spreadsheet."
							checked={style === "TabPerAdHoc"}
							onChange={(e) => setStyle("TabPerAdHoc")}
						/>
						<label htmlFor="TabPerAdHoc">
							All comments plus one sheet per ad-hoc
						</label>
					</ListItem>
					<ListItem>
						<input
							type="radio"
							id="TabPerCommentGroup"
							title="Export all comments plus a sheet for each comment group. Optionally updates existing spreadsheet."
							checked={style === "TabPerCommentGroup"}
							onChange={(e) => setStyle("TabPerCommentGroup")}
						/>
						<label htmlFor="TabPerCommentGroup">
							All comments plus one sheet per comment group
						</label>
					</ListItem>
				</List>
			</Row>
			<Row>
				<input
					type="file"
					id="fileInput"
					accept=".csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
					onChange={(e) => {
						setFile(e.target.files?.[0]);
					}}
				/>
			</Row>
			{file && format === "modern" && (
				<Row>
					<List>
						<ListItem>
							<input
								type="radio"
								id="sheetAction"
								title='Delete sheets (except for the "Title" and "Revision History" sheets).'
								checked={!appendSheets}
								onChange={(e) => setAppendSheets(false)}
							/>
							<label htmlFor="sheets">
								Replace sheets (except Title and Revision
								History)
							</label>
						</ListItem>
						<ListItem>
							<input
								type="radio"
								id="sheetAction"
								title="Replace existing sheets with same name or append as new sheets."
								checked={Boolean(appendSheets)}
								onChange={(e) => setAppendSheets(true)}
							/>
							<label htmlFor="sheets">Append sheets</label>
						</ListItem>
					</List>
				</Row>
			)}
		</Form>
	);
}

function CommentsExport({
	ballot,
	disabled,
}: {
	ballot?: Ballot;
	disabled?: boolean;
}) {
	return (
		<ActionButtonDropdown
			name="export"
			title="Export to file"
			disabled={!ballot || disabled}
			dropdownRenderer={(props) => (
				<CommentsExportDropdown ballot={ballot!} {...props} />
			)}
		/>
	);
}

export default CommentsExport;
