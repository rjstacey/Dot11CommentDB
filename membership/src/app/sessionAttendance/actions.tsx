import React from "react";
import {
	useParams,
	useNavigate,
	useSearchParams,
	useLocation,
} from "react-router";
import {
	ActionButton,
	ActionButtonDropdown,
	Checkbox,
	TableColumnSelector,
	ButtonGroup,
	TableViewSelector,
	SplitPanelButton,
	Spinner,
	DropdownRendererProps,
	Form,
	Row,
	Button,
} from "dot11-components";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
	sessionAttendeesSelectors,
	sessionAttendeesActions,
	selectSessionAttendeesState,
	exportAttendanceForMinutes,
	selectSessionAttendeesSession,
} from "@/store/sessionAttendees";
import {
	sessionRegistrationActions,
	sessionRegistrationSelectors,
	uploadSessionRegistration,
} from "@/store/sessionRegistration";
import { importAttendanceSummary } from "@/store/attendanceSummary";
import {
	selectMemberEntities,
	addMembers,
	updateMembers,
	Member,
	MemberUpdate,
} from "@/store/members";

import SessionSelector from "./SessionSelector";
import { refresh } from "./routes";
import { tableColumns as sessionAttendeesColumns } from "./table";
import { tableColumns as sessionRegistrationColumns } from "./sessionRegistration";
import { copyChartToClipboard, downloadChart } from "@/components/copyChart";
import { sessionAttendeeToNewMember } from "./detail";

function ImportRegistrationForm({ methods }: DropdownRendererProps) {
	const dispatch = useAppDispatch();
	const { groupName } = useAppSelector(selectSessionAttendeesState);
	const session = useAppSelector(selectSessionAttendeesSession)!;

	const [busy, setBusy] = React.useState(false);
	const [file, setFile] = React.useState<File | null>(null);

	let errorText = "";
	if (!file) errorText = "Select spreadsheet file";

	async function submit() {
		if (!file) return;
		setBusy(true);
		await dispatch(
			uploadSessionRegistration(groupName!, session.number!, file)
		);
		setBusy(false);
		methods.close();
	}

	return (
		<Form
			style={{ width: 300 }}
			errorText={errorText}
			submitLabel="OK"
			cancelLabel="Cancel"
			submit={submit}
			cancel={methods.close}
			busy={busy}
		>
			<Row>
				<input
					type="file"
					accept=".csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
					onChange={(e) => setFile(e.target.files?.[0] || null)}
				/>
			</Row>
		</Form>
	);
}

function BulkUpdateForm({ methods }: DropdownRendererProps) {
	const { groupName, selected, ids, entities } = useAppSelector(
		selectSessionAttendeesState
	);
	const session = useAppSelector(selectSessionAttendeesSession)!;

	const [importAttendance, setImportAttendance] = React.useState(true);
	const [importNew, setImportNew] = React.useState(true);
	const [importUpdates, setImportUpdates] = React.useState(true);
	const [selectedOnly, setSelectedOnly] = React.useState(false);
	const [busy, setBusy] = React.useState(false);

	const dispatch = useAppDispatch();
	const memberEntities = useAppSelector(selectMemberEntities);

	const list = selectedOnly ? selected : ids;

	const adds = React.useMemo(
		() =>
			list
				.map((id) => entities[id]!)
				.filter(
					(attendee) => attendee && !memberEntities[attendee.SAPIN]
				)
				.map((attendee) =>
					sessionAttendeeToNewMember(attendee, session)
				),
		[list, entities, memberEntities, session]
	);

	const updates = React.useMemo(() => {
		const updates: MemberUpdate[] = [];
		list.map((id) => entities[id]!)
			.filter((attendee) => attendee && memberEntities[attendee.SAPIN])
			.forEach((a) => {
				const m = memberEntities[a.SAPIN]!;
				const changes: Partial<Member> = {
					Name: m.Name !== a.Name ? a.Name : undefined,
					Email: m.Email !== a.Email ? a.Email : undefined,
					Affiliation:
						m.Affiliation !== a.Affiliation
							? a.Affiliation
							: undefined,
					Employer:
						m.Employer !== a.Employer ? a.Employer : undefined,
				};
				let key: keyof Member;
				for (key in changes)
					if (typeof changes[key] === "undefined")
						delete changes[key];
				if (Object.keys(changes).length > 0)
					updates.push({ id: m.SAPIN, changes });
			});
		return updates;
	}, [list, entities, memberEntities]);

	async function submit() {
		setBusy(true);
		if (importAttendance)
			await dispatch(
				importAttendanceSummary(groupName!, session.number!)
			);
		if (importNew) await dispatch(addMembers(adds));
		if (importUpdates) await dispatch(updateMembers(updates));
		setBusy(false);
		methods.close();
	}

	return (
		<Form
			style={{ width: 300 }}
			submitLabel="OK"
			cancelLabel="Cancel"
			submit={submit}
			cancel={methods.close}
			busy={busy}
		>
			<Row style={{ justifyContent: "flex-start" }}>
				<Checkbox
					checked={importAttendance}
					onChange={() => setImportAttendance(!importAttendance)}
				/>
				<label>Import session attendance</label>
			</Row>
			<Row style={{ justifyContent: "flex-start" }}>
				<Checkbox
					checked={importNew}
					onChange={() => setImportNew(!importNew)}
				/>
				<label>Add new members ({`${adds.length} members`})</label>
			</Row>
			<Row style={{ justifyContent: "flex-start" }}>
				<Checkbox
					checked={importUpdates}
					onChange={() => setImportUpdates(!importUpdates)}
				/>
				<label>
					Update member details ({`${updates.length} members`})
				</label>
			</Row>
			<Row style={{ justifyContent: "flex-start" }}>
				<Checkbox
					checked={selectedOnly}
					onChange={() => setSelectedOnly(!selectedOnly)}
				/>
				<label>Selected entries only</label>
			</Row>
		</Form>
	);
}

function SessionAttendanceActions() {
	const dispatch = useAppDispatch();
	const location = useLocation();
	const navigate = useNavigate();
	const params = useParams();
	const groupName = params.groupName!;
	let [searchParams] = useSearchParams();
	const useDaily =
		searchParams.has("useDaily") &&
		searchParams.get("useDaily") !== "false";

	const { loading } = useAppSelector(selectSessionAttendeesState);

	const toggleUseDaily = () => {
		if (useDaily) searchParams.delete("useDaily");
		else searchParams.append("useDaily", "true");
		navigate({ search: searchParams.toString() });
	};

	const showChart = /chart$/.test(location.pathname);
	const toggleShowChart = () => {
		let pathname = "" + sessionNumber;
		if (!showChart) pathname += "/chart";
		navigate({ pathname, search: searchParams.toString() });
	};

	const showRegistration = /registration$/.test(location.pathname);
	const toggleShowRegistration = () => {
		let pathname = "" + sessionNumber;
		if (!showRegistration) pathname += "/registration";
		navigate({ pathname, search: searchParams.toString() });
	};

	const sessionNumber = Number(params.sessionNumber);
	const setSessionNumber = (sessionNumber: number | null) => {
		let pathname = "";
		if (sessionNumber) {
			pathname += sessionNumber;
			if (showChart) pathname += "/chart";
		}
		navigate({ pathname, search: searchParams.toString() });
	};

	const tableSelectors = showRegistration
		? sessionRegistrationSelectors
		: sessionAttendeesSelectors;
	const tableActions = showRegistration
		? sessionRegistrationActions
		: sessionAttendeesActions;
	const tableColumns = showRegistration
		? sessionRegistrationColumns
		: sessionAttendeesColumns;

	return (
		<div className="top-row">
			<div style={{ display: "flex" }}>
				<SessionSelector
					value={sessionNumber}
					onChange={setSessionNumber}
				/>
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						marginLeft: 10,
					}}
				>
					<div style={{ display: "flex", alignItems: "center" }}>
						<Checkbox
							checked={useDaily}
							onChange={toggleUseDaily}
							disabled={loading}
						/>
						<label style={{ marginLeft: 10 }}>
							Daily attendance
						</label>
					</div>
					<div style={{ display: "flex", alignItems: "center" }}>
						<Checkbox
							checked={!useDaily}
							onChange={toggleUseDaily}
							disabled={loading}
						/>
						<label style={{ marginLeft: 10 }}>
							Attendance summary
						</label>
					</div>
				</div>
			</div>
			{loading && <Spinner />}
			<div className="control-group">
				<ButtonGroup
					className="button-group"
					style={{ visibility: showChart ? "hidden" : "visible" }}
				>
					<div>Table view</div>
					<div style={{ display: "flex" }}>
						<TableViewSelector
							selectors={tableSelectors}
							actions={tableActions}
						/>
						<TableColumnSelector
							selectors={tableSelectors}
							actions={tableActions}
							columns={tableColumns}
						/>
						<SplitPanelButton
							selectors={tableSelectors}
							actions={tableActions}
						/>
					</div>
				</ButtonGroup>
				<ActionButtonDropdown
					title="Bulk update form"
					selectRenderer={() => (
						<Button
							style={{
								display: "flex",
								flexDirection: "column",
								alignItems: "center",
								fontSize: 10,
								fontWeight: 700,
							}}
							disabled={
								!sessionNumber || showChart || showRegistration
							}
						>
							<span>Bulk</span>
							<span>Update</span>
						</Button>
					)}
					dropdownRenderer={(props) => <BulkUpdateForm {...props} />}
					disabled={!sessionNumber || showChart || showRegistration}
				/>
				<ActionButtonDropdown
					title="Import registration"
					selectRenderer={() => (
						<Button
							style={{
								display: "flex",
								flexDirection: "column",
								alignItems: "center",
								fontSize: 10,
								fontWeight: 700,
							}}
							disabled={!sessionNumber}
						>
							<span>Import</span>
							<span>Registration</span>
						</Button>
					)}
					dropdownRenderer={(props) => (
						<ImportRegistrationForm {...props} />
					)}
					disabled={!sessionNumber}
				/>
				<Button
					style={{
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						fontSize: 10,
						fontWeight: 700,
					}}
					title="Export attendance for minutes"
					disabled={!sessionNumber}
					onClick={() =>
						dispatch(
							exportAttendanceForMinutes(groupName, sessionNumber)
						)
					}
				>
					<span>Attendance</span>
					<span>for minutes</span>
				</Button>
				<ActionButton
					name="bi-r-circle"
					title="Show registration"
					disabled={!sessionNumber}
					isActive={showRegistration}
					onClick={toggleShowRegistration}
				/>
				<ActionButton
					name="bi-bar-chart-line"
					title="Chart attendance"
					disabled={!sessionNumber}
					isActive={showChart}
					onClick={toggleShowChart}
				/>
				<ActionButton
					name="copy"
					title="Copy chart to clipboard"
					disabled={!showChart}
					onClick={copyChartToClipboard}
				/>
				<ActionButton
					name="export"
					title="Export chart"
					disabled={!showChart}
					onClick={downloadChart}
				/>
				<ActionButton
					name="refresh"
					title="Refresh"
					onClick={refresh}
				/>
			</div>
		</div>
	);
}

export default SessionAttendanceActions;
