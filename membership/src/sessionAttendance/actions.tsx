import * as React from "react";
import { useParams, useNavigate, generatePath } from "react-router-dom";

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
} from "dot11-components";

import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
	setDailyAttendance,
	sessionAttendeesSelectors,
	sessionAttendeesActions,
	selectSessionAttendeesState,
	selectDailyAttendance,
	SessionAttendee,
} from "../store/sessionAttendees";
import { selectSessionEntities, Session } from "../store/sessions";
import {
	selectMemberEntities,
	addMembers,
	updateMembers,
	Member,
	MemberAdd,
	MemberUpdate,
} from "../store/members";
import { exportAttendanceForMinutes } from "../store/sessionParticipation";

import SessionSelector from "./SessionSelector";
import { tableColumns } from "./table";
import { useRoutePath } from "../app/routes";
import { copyChartToClipboard, downloadChart } from "../components/copyChart";

function sessionAttendeeToMember(session: Session, attendee: SessionAttendee) {
	const member: MemberAdd = {
		DateAdded: session.startDate, // Show add as from session start
		SAPIN: attendee.SAPIN,
		Name: attendee.Name,
		FirstName: attendee.FirstName,
		LastName: attendee.LastName,
		MI: attendee.MI,
		Employer: attendee.Employer || "",
		Email: attendee.Email,
		Affiliation: attendee.Affiliation,
		Status: "Non-Voter",
		ContactInfo: attendee.ContactInfo,
	};
	return member;
}

function ImportAttendeeForm({ methods }: DropdownRendererProps) {
	const { sessionId } = useAppSelector(selectSessionAttendeesState);
	const session = useAppSelector(selectSessionEntities)[sessionId!]!;

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
				.map((attendee) => sessionAttendeeToMember(session, attendee)),
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

	function submit() {
		if (importNew) dispatch(addMembers(adds));
		if (importUpdates) dispatch(updateMembers(updates));
		methods.close();
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

function SessionAttendanceActions() {
	const dispatch = useAppDispatch();
	const navigate = useNavigate();
	let routePath = useRoutePath();
	const params = useParams();

	const { loading } = useAppSelector(selectSessionAttendeesState);
	const dailyAttendance = useAppSelector(selectDailyAttendance);
	const toggleUseDaily = () => {
		dispatch(setDailyAttendance(!dailyAttendance));
		refresh();
	};

	const sessionId = Number(params.sessionNumber);
	const setSession = (sessionId: number | null) => {
		if (sessionId) {
			if (!/\/:sessionNumber/.test(routePath))
				routePath += "/:sessionNumber";
		} else {
			routePath = routePath.replace(/\/:sessionNumber(\/chart)?/, "");
		}
		navigate(
			generatePath(routePath, {
				...params,
				sessionNumber: sessionId ? sessionId.toString() : undefined,
			})
		);
	};
	const refresh = () => setSession(sessionId);

	const showChart = /chart$/.test(routePath);
	const setShowChart = (showChart: boolean) => {
		let path =
			generatePath(routePath, params).replace("/chart", "") +
			(showChart ? "/chart" : "");
		navigate(path);
	};

	return (
		<div className="top-row">
			<div style={{ display: "flex" }}>
				<SessionSelector value={sessionId} onChange={setSession} />
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						marginLeft: 10,
					}}
				>
					<div style={{ display: "flex", alignItems: "center" }}>
						<Checkbox
							checked={dailyAttendance}
							onChange={toggleUseDaily}
							disabled={loading}
						/>
						<label style={{ marginLeft: 10 }}>
							Daily attendance
						</label>
					</div>
					<div style={{ display: "flex", alignItems: "center" }}>
						<Checkbox
							checked={!dailyAttendance}
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
						<ImportAttendeeForm {...props} />
					)}
				/>
				<ActionButton
					name="bi-list-check"
					title="Export attendance for minutes"
					disabled={!sessionId}
					onClick={() =>
						dispatch(exportAttendanceForMinutes(sessionId!))
					}
				/>
				<ActionButton
					name="bi-bar-chart-line"
					title="Chart attendance"
					disabled={!sessionId}
					isActive={showChart}
					onClick={() => setShowChart(!showChart)}
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
