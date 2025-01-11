import * as React from "react";

import {
	Form,
	Row,
	Col,
	List,
	ListItem,
	ActionButtonDropdown,
	Button,
	type DropdownRendererProps,
} from "dot11-components";

import { useAppDispatch } from "@/store/hooks";
import { uploadMembers, UploadFormat } from "@/store/members";

function MembersUploadForm({ methods }: DropdownRendererProps) {
	const dispatch = useAppDispatch();
	const fileRef = React.useRef<HTMLInputElement>(null);
	const [errMsg, setErrMsg] = React.useState("");
	const [format, setFormat] = React.useState(UploadFormat.Roster);
	const [busy, setBusy] = React.useState(false);

	const submit = async () => {
		const files = fileRef.current?.files;
		if (!files) {
			setErrMsg("Select spreadsheet file");
			return;
		}
		setBusy(true);
		await dispatch(uploadMembers(format, files[0]));
		setBusy(false);
		methods.close();
	};

	const changeFormat: React.ChangeEventHandler<HTMLInputElement> = (e) =>
		setFormat(e.target.value);

	return (
		<Form
			title="Upload spreadsheet"
			errorText={errMsg}
			submit={submit}
			cancel={methods.close}
			busy={busy}
			style={{ width: 400 }}
		>
			<Row>
				<List label="Import:">
					<ListItem>
						<input
							type="radio"
							title="Import members from MyProject roster"
							value={UploadFormat.Roster}
							checked={format === UploadFormat.Roster}
							onChange={changeFormat}
						/>
						<label>Members from MyProject roster</label>
					</ListItem>
					<ListItem>
						<input
							type="radio"
							title="Import members (replaces existing)"
							value={UploadFormat.Members}
							checked={format === UploadFormat.Members}
							onChange={changeFormat}
						/>
						<label>Members from Access database</label>
					</ListItem>
					<ListItem>
						<input
							type="radio"
							title="Import member SAPINs (replaces existing)"
							value={UploadFormat.SAPINs}
							checked={format === UploadFormat.SAPINs}
							onChange={changeFormat}
						/>
						<label>Member SAPINs from Access database</label>
					</ListItem>
					<ListItem>
						<input
							type="radio"
							title="Import member email addresses (replaces existing)"
							value={UploadFormat.Emails}
							checked={format === UploadFormat.Emails}
							onChange={changeFormat}
						/>
						<label>
							Member email addresses from Access database
						</label>
					</ListItem>
					<ListItem>
						<input
							type="radio"
							title="Import member history (replaces existing)"
							value={UploadFormat.History}
							checked={format === UploadFormat.History}
							onChange={changeFormat}
						/>
						<label>Member history from Access database</label>
					</ListItem>
				</List>
			</Row>
			<Row>
				<Col>
					<label htmlFor="fileInput">Spreadsheet:</label>
					<input
						type="file"
						id="fileInput"
						accept=".csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
						ref={fileRef}
						onClick={(e) => setErrMsg("")}
					/>
				</Col>
			</Row>
		</Form>
	);
}

const MembersUpload = () => (
	<ActionButtonDropdown
		name="upload"
		title="Upload members"
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
				<span>Upload</span>
				<span>Members</span>
			</Button>
		)}
		dropdownRenderer={(props) => <MembersUploadForm {...props} />}
	/>
);

export default MembersUpload;
