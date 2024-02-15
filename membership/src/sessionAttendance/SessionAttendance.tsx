import * as React from "react";
import { useParams } from "react-router-dom";

import {
	AppTable,
	SelectHeaderCell,
	SelectCell,
	ColumnProperties,
	ActionButton,
	ActionButtonDropdown,
	Form,
	Row,
	Checkbox,
	ShowFilters,
	GlobalFilter,
	TableColumnSelector,
	ButtonGroup,
	TableViewSelector,
	SplitPanel,
	Panel,
	SplitPanelButton,
	TablesConfig,
	TableConfig,
	CellRendererProps,
	DropdownRendererProps,
	Spinner,
} from "dot11-components";

import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
	fields,
	loadSessionAttendees,
	clearSessionAttendees,
	setDailyAttendance,
	sessionAttendeesSelectors,
	sessionAttendeesActions,
	selectSessionAttendeesState,
	selectDailyAttendance,
	type SessionAttendee,
	type SyncedSessionAttendee,
} from "../store/sessionAttendees";
import {
	selectMemberEntities,
	addMembers,
	updateMembers,
	type Member,
	type MemberAdd,
	type MemberUpdate,
} from "../store/members";

import MemberAttendanceDetail from "./MemberAttendanceDetail";
import SessionSelector from "./SessionSelector";

import styles from "./sessionAttendance.module.css";

const BLANK_STR = "(Blank)";

export const renderDiff = (newStr: string, oldStr: string | null) => {
	let newStyle: React.CSSProperties = {},
		oldStyle: React.CSSProperties = {};

	if (!newStr) {
		newStr = BLANK_STR;
		newStyle.fontStyle = "italic";
	}

	if (oldStr === "") {
		oldStr = BLANK_STR;
		oldStyle.fontStyle = "italic";
	}

	if (oldStr !== null) {
		return (
			<>
				<del style={oldStyle}>{oldStr}</del>
				<ins style={newStyle}>{newStr}</ins>
			</>
		);
	} else {
		return <span style={newStyle}>{newStr}</span>;
	}
};

export const renderName = ({
	rowData,
}: CellRendererProps<SyncedSessionAttendee>) => (
	<div className={styles.tableCell} style={{ fontWeight: "bold" }}>
		{renderDiff(rowData.Name, rowData.OldName)}
	</div>
);

export const renderEmail = ({
	rowData,
}: CellRendererProps<SyncedSessionAttendee>) => (
	<div className={styles.tableCell}>{renderDiff(rowData.Email, rowData.OldEmail)}</div>
);

export const renderEmployer = ({
	rowData,
}: CellRendererProps<SyncedSessionAttendee>) => (
	// The "Employer" field is present with "daily attendance" but undefined with "attendance summary"
	<div className={styles.tableCell}>{rowData.Employer === undefined? "N/A": renderDiff(rowData.Employer, rowData.OldEmployer)}</div>
);

export const renderAffiliation = ({
	rowData,
}: CellRendererProps<SyncedSessionAttendee>) => (
	<div className={styles.tableCell}>
		{renderDiff(rowData.Affiliation, rowData.OldAffiliation)}
	</div>
);

const tableColumns: ColumnProperties[] = [
	{
		key: "__ctrl__",
		width: 40,
		flexGrow: 0,
		flexShrink: 0,
		headerRenderer: SelectHeaderCell,
		cellRenderer: (p) => (
			<SelectCell
				selectors={sessionAttendeesSelectors}
				actions={sessionAttendeesActions}
				{...p}
			/>
		),
	},
	{ key: "SAPIN", label: "SA PIN", width: 80, flexGrow: 1, flexShrink: 1 },
	{
		key: "Name",
		label: "Name",
		width: 200,
		flexGrow: 1,
		flexShrink: 1,
		cellRenderer: renderName,
	},
	{
		key: "Email",
		label: "Email",
		width: 200,
		flexGrow: 1,
		flexShrink: 1,
		cellRenderer: renderEmail,
	},
	{
		key: "Employer",
		label: "Employer",
		width: 300,
		flexGrow: 1,
		flexShrink: 1,
		cellRenderer: renderEmployer,
	},
	{
		key: "Affiliation",
		label: "Affiliation",
		width: 300,
		flexGrow: 1,
		flexShrink: 1,
		cellRenderer: renderAffiliation,
	},
	{ key: "Status", label: "Status", width: 100, flexGrow: 1, flexShrink: 1 },
	{
		key: "AttendancePercentage",
		label: "Attendance",
		width: 100,
		flexGrow: 1,
		flexShrink: 1,
		dataRenderer: (d: number) => d.toFixed(0) + "%",
	},
	{
		key: "AttendanceOverride",
		label: "Attendance override",
		width: 100,
		flexGrow: 1,
		flexShrink: 1,
	},
	{
		key: "Notes",
		label: "Notes",
		width: 150,
		flexGrow: 1,
		flexShrink: 1,
	}
];

const defaultTablesColumns = {
	Basic: [
		"__ctrl__",
		"SAPIN",
		"Name",
		"Email",
		"Employer",
		"Affiliation",
		"Status",
	],
	Attendance: [
		"__ctrl__",
		"SAPIN",
		"Name",
		"Email",
		"Employer",
		"Affiliation",
		"Status",
		"AttendancePercentage",
		"AttendanceOverride",
		"Notes"
	],
};

let defaultTablesConfig: TablesConfig = {};
let tableView: keyof typeof defaultTablesColumns;
for (tableView in defaultTablesColumns) {
	const tableConfig: TableConfig = {
		fixed: false,
		columns: {},
	};
	for (const column of tableColumns) {
		const key = column.key;
		tableConfig.columns[key] = {
			unselectable: key.startsWith("__"),
			shown: defaultTablesColumns[tableView].includes(key),
			width: column.width || 200,
		};
	}
	defaultTablesConfig[tableView] = tableConfig;
}

function sessionAttendeeToMember(attendee: SessionAttendee) {
	const member: MemberAdd = {
		SAPIN: attendee.SAPIN,
		Name: attendee.Name,
		FirstName: attendee.FirstName,
		LastName: attendee.LastName,
		MI: attendee.MI,
		Employer: attendee.Employer || "",
		Email: attendee.Email,
		Affiliation: attendee.Affiliation,
		Status: "Non-Voter",
		Access: 0,
		ContactInfo: attendee.ContactInfo,
	};
	return member;
}

function InportAttendeeForm({ methods }: DropdownRendererProps) {
	const [importNew, setImportNew] = React.useState(true);
	const [importUpdates, setImportUpdates] = React.useState(true);
	const [selectedOnly, setSelectedOnly] = React.useState(false);

	const dispatch = useAppDispatch();
	const { selected, ids, entities } = useAppSelector(
		selectSessionAttendeesState
	);
	const memberEntities = useAppSelector(selectMemberEntities);

	const list = selectedOnly ? selected : ids;

	const adds = React.useMemo(
		() =>
			list
				.map((id) => entities[id]!)
				.filter(
					(attendee) => attendee && !memberEntities[attendee.SAPIN]
				)
				.map(sessionAttendeeToMember),
		[list, entities, memberEntities]
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

	function submit() {
		if (importNew) dispatch(addMembers(adds));
		if (importUpdates) dispatch(updateMembers(updates));
	}

	return (
		<Form
			style={{ width: 300 }}
			submitLabel="OK"
			cancelLabel="Cancel"
			submit={submit}
			cancel={methods.close}
		>
			<Row style={{ justifyContent: "flex-start" }}>
				<Checkbox
					checked={importNew}
					onChange={() => setImportNew(!importNew)}
				/>
				<label>Import new members</label>
			</Row>
			<Row style={{ justifyContent: "flex-start" }}>
				<Checkbox
					checked={importUpdates}
					onChange={() => setImportUpdates(!importUpdates)}
				/>
				<label>Import member updates</label>
			</Row>
			<Row style={{ justifyContent: "flex-start" }}>
				<Checkbox
					checked={selectedOnly}
					onChange={() => setSelectedOnly(!selectedOnly)}
				/>
				<label>Selected entries only</label>
			</Row>
			<Row>
				<span>{importNew ? `${adds.length} adds` : ""}</span>
				<span>{importUpdates ? `${updates.length} updates` : ""}</span>
			</Row>
		</Form>
	);
}

function SessionAttendance() {
	const dispatch = useAppDispatch();
	const { groupName } = useParams();
	const { loading, sessionId } = useAppSelector(
		selectSessionAttendeesState
	);
	const dailyAttendance = useAppSelector(selectDailyAttendance);
	const toggleUseDaily = () => {
		dispatch(setDailyAttendance(!dailyAttendance));
		refresh();
	};

	const load = (sessionId: number | null) =>
		dispatch(
			groupName && sessionId
				? loadSessionAttendees(groupName, sessionId)
				: clearSessionAttendees()
		);
	const refresh = () => load(sessionId);

	return (
		<>
			<div className="top-row">
				<div style={{display: 'flex'}}>
					<SessionSelector value={sessionId} onChange={load} />
					<div style={{display: 'flex', flexDirection: 'column', marginLeft: 10}}>
						<div style={{display: 'flex', alignItems: 'center'}}>
							<Checkbox
								checked={dailyAttendance}
								onChange={toggleUseDaily}
								disabled={loading}
							/>
							<label style={{marginLeft: 10}}>Daily attendance</label>
						</div>
						<div style={{display: 'flex', alignItems: 'center'}}>
							<Checkbox
								checked={!dailyAttendance}
								onChange={toggleUseDaily}
								disabled={loading}
							/>
							<label style={{marginLeft: 10}}>Attendance summary</label>
						</div>
					</div>
				</div>
				{loading && <Spinner />}
				<div style={{ display: "flex" }}>
					<ButtonGroup>
						<div>Table view</div>
						<div style={{ display: "flex" }}>
							<TableViewSelector
								selectors={sessionAttendeesSelectors}
								actions={sessionAttendeesActions}
							/>
							<TableColumnSelector
								selectors={sessionAttendeesSelectors}
								actions={sessionAttendeesActions}
								columns={tableColumns}
							/>
							<SplitPanelButton
								selectors={sessionAttendeesSelectors}
								actions={sessionAttendeesActions}
							/>
						</div>
					</ButtonGroup>
					<ActionButtonDropdown
						name="import"
						title="Import new attendees"
						dropdownRenderer={(props) => (
							<InportAttendeeForm {...props} />
						)}
					/>
					<ActionButton
						name="refresh"
						title="Refresh"
						onClick={refresh}
					/>
				</div>
			</div>

			<div
				style={{ display: "flex", width: "100%", alignItems: "center" }}
			>
				<ShowFilters
					selectors={sessionAttendeesSelectors}
					actions={sessionAttendeesActions}
					fields={fields}
				/>
				<GlobalFilter
					selectors={sessionAttendeesSelectors}
					actions={sessionAttendeesActions}
				/>
			</div>

			<SplitPanel
				selectors={sessionAttendeesSelectors}
				actions={sessionAttendeesActions}
			>
				<Panel>
					<AppTable
						columns={tableColumns}
						headerHeight={40}
						estimatedRowHeight={50}
						defaultTablesConfig={defaultTablesConfig}
						selectors={sessionAttendeesSelectors}
						actions={sessionAttendeesActions}
					/>
				</Panel>
				<Panel className="details-panel">
					<MemberAttendanceDetail />
				</Panel>
			</SplitPanel>
		</>
	);
}

export default SessionAttendance;
