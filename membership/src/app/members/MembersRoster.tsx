import React from "react";

import {
	Checkbox,
	Button,
	ActionButtonDropdown,
	Form,
	Field,
	Row,
	Col,
	type DropdownRendererProps,
} from "dot11-components";

import { useAppDispatch } from "@/store/hooks";
import { updateMyProjectRoster } from "@/store/myProjectRoster";

function RosterUpdateDropdown({ methods }: DropdownRendererProps) {
	const dispatch = useAppDispatch();
	const [removeUnchanged, setRemoveUnchanged] = React.useState(true);
	const [appendNew, setAppendNew] = React.useState(false);
	const [file, setFile] = React.useState<File | null>(null);
	const [errMsg, setErrMsg] = React.useState("");
	const [busy, setBusy] = React.useState(false);

	const submit = async () => {
		if (!file) {
			setErrMsg("Select spreadsheet file");
			return;
		}
		setBusy(true);
		await dispatch(
			updateMyProjectRoster(file, { removeUnchanged, appendNew })
		);
		setBusy(false);
		methods.close();
	};

	return (
		<Form
			style={{ width: 400 }}
			title="Update MyProject roster"
			errorText={errMsg}
			submit={submit}
			cancel={methods.close}
			busy={busy}
		>
			<Row>
				{
					'Take the roster as exported by MyProject and update the "Involvement Level" column to reflect member status.'
				}
			</Row>
			<Row>
				<Field label="Remove rows with no change:">
					<Checkbox
						checked={removeUnchanged}
						onChange={(e) => setRemoveUnchanged(e.target.checked)}
					/>
				</Field>
			</Row>
			<Row>
				<Field label="Append members that are not present:">
					<Checkbox
						checked={appendNew}
						onChange={(e) => setAppendNew(e.target.checked)}
					/>
				</Field>
			</Row>
			<Row>
				<Col>
					<label htmlFor="fileInput">
						MyProject roster spreadsheet:
					</label>
					<input
						type="file"
						id="fileInput"
						accept=".csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
						onChange={(e) =>
							setFile(e.target.files ? e.target.files[0] : null)
						}
					/>
				</Col>
			</Row>
		</Form>
	);
}

function MembersRoster() {
	return (
		<ActionButtonDropdown
			title="Update roster"
			selectRenderer={() => (
				<Button
					style={{
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						fontSize: 10,
						fontWeight: 700,
					}}
				>
					<span>Update</span>
					<span>Roster</span>
				</Button>
			)}
			dropdownRenderer={(props) => <RosterUpdateDropdown {...props} />}
		/>
	);
}

export default MembersRoster;
