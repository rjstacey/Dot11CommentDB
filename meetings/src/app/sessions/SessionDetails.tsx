import * as React from "react";
import { connect, ConnectedProps } from "react-redux";
import { EntityId } from "@reduxjs/toolkit";
import { DateTime } from "luxon";
import { Tabs, Tab, Button, Row, Col, Form } from "react-bootstrap";
import {
	shallowDiff,
	deepMergeTagMultiple,
	isMultiple,
	debounce,
	ConfirmModal,
	TextArea,
	Select,
	Multiple,
} from "@common";

import TimeZoneSelector from "@/components/TimeZoneSelector";
import ImatMeetingSelector from "@/components/ImatMeetingSelector";
import GroupParentsSelector from "@/components/GroupParentsSelector";
import RoomDetails from "./RoomDetails";
import TimeslotDetails from "./TimeslotDetails";
import SessionCredit from "./SessionCredit";

import { RootState } from "@/store";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { AccessLevel } from "@/store/user";
import {
	loadSessions,
	addSession,
	updateSession,
	deleteSessions,
	setSelected,
	setUiProperties,
	SessionTypeOptions,
	selectSessionsState,
	selectUserSessionsAccess,
	Session,
	SessionCreate,
	SessionType,
} from "@/store/sessions";

import ShowAccess from "@/components/ShowAccess";

const BLANK_STR = "(Blank)";
const MULTIPLE_STR = "(Multiple)";

const defaultSession: SessionCreate = {
	number: null,
	name: "New session",
	type: "p",
	isCancelled: false,
	imatMeetingId: null,
	startDate: new Date().toISOString().substring(0, 10),
	endDate: new Date().toISOString().substring(0, 10),
	timezone: "America/New_York",
	groupId: null,
	rooms: [],
	timeslots: [],
	defaultCredits: [],
	OrganizerID: "",
};

function SessionTypeSelector({
	value,
	onChange,
	...otherProps
}: {
	value: SessionType | null;
	onChange: (value: SessionType) => void;
} & Pick<
	React.ComponentProps<typeof Select>,
	"readOnly" | "disabled" | "placeholder" | "id" | "style" | "className"
>) {
	const values = SessionTypeOptions.filter((o) => o.value === value);
	const handleChange = (values: typeof SessionTypeOptions) =>
		onChange(values.length > 0 ? values[0].value : "o");
	return (
		<Select
			values={values}
			options={SessionTypeOptions}
			onChange={handleChange}
			{...otherProps}
		/>
	);
}

function SessionBasics({
	session,
	updateSession,
	readOnly,
}: {
	session: MultipleSession;
	updateSession: (changes: Partial<Session>) => void;
	readOnly?: boolean;
}) {
	function handleChange(changes: Partial<Session>) {
		if ("startDate" in changes) {
			const startDate = DateTime.fromISO(changes.startDate!);
			const endDate = DateTime.fromISO(session.endDate);
			if (startDate.isValid) {
				// For plenary and interim sessions, assume ends 5 days later (usually Sun - Fri)
				// otherwise, just make sure end date is later than start date
				if (session.type === "p" || session.type === "i")
					changes.endDate = startDate.plus({ days: 5 }).toISODate()!;
				else if (endDate < startDate)
					changes.endDate = startDate.toISODate()!;
			}
		} else if ("endDate" in changes) {
			// Ensure that the start date is never later than end date
			const endDate = DateTime.fromISO(changes.endDate!);
			const startDate = DateTime.fromISO(session.startDate);
			if (endDate.isValid && endDate < startDate)
				changes.startDate = endDate.toISODate()!;
		}
		updateSession(changes);
	}

	const nameMinWidthCh = Math.max(session.name.length, 24);

	return (
		<>
			<Form.Group as={Row} className="mb-3" controlId="session-number">
				<Form.Label column>Session number:</Form.Label>
				<Col xs="auto">
					<Form.Control
						type="number"
						style={{ width: "6rem" }}
						name="Number"
						value={
							isMultiple(session.number)
								? ""
								: session.number || ""
						}
						placeholder={
							isMultiple(session.number)
								? MULTIPLE_STR
								: BLANK_STR
						}
						onChange={(e) =>
							handleChange({
								number: e.target.value
									? Number(e.target.value)
									: null,
							})
						}
						disabled={readOnly}
						min={1}
						step={0.1}
						autoComplete="none"
					/>
				</Col>
			</Form.Group>
			<Form.Group as={Row} className="mb-3" controlId="session-name">
				<Form.Label column>Session name:</Form.Label>
				<Col>
					<TextArea
						style={{ width: `${nameMinWidthCh}ch` }}
						name="Name"
						value={isMultiple(session.name) ? "" : session.name}
						placeholder={
							isMultiple(session.name) ? MULTIPLE_STR : BLANK_STR
						}
						onChange={(e) => handleChange({ name: e.target.value })}
						disabled={readOnly}
						autoComplete="none"
					/>
				</Col>
			</Form.Group>
			<Form.Group as={Row} className="mb-3" controlId="session-type">
				<Form.Label column>Session type:</Form.Label>
				<Col>
					<SessionTypeSelector
						value={
							!session.type || isMultiple(session.type)
								? null
								: session.type
						}
						onChange={(type) => handleChange({ type })}
						readOnly={readOnly}
					/>
				</Col>
			</Form.Group>
			<Form.Group
				as={Row}
				className="mb-3"
				controlId="session-organizing-group"
			>
				<Form.Label column>Organizing group:</Form.Label>
				<Col>
					<GroupParentsSelector
						value={
							isMultiple(session.groupId) ? null : session.groupId
						}
						onChange={(groupId) => handleChange({ groupId })}
						readOnly={readOnly}
					/>
				</Col>
			</Form.Group>
			<Form.Group as={Row} className="mb-3" controlId="session-start">
				<Form.Label column>Start:</Form.Label>
				<Col xs="auto">
					<Form.Control
						type="date"
						value={
							isMultiple(session.startDate)
								? ""
								: session.startDate
						}
						onChange={(e) =>
							handleChange({ startDate: e.target.value })
						}
						placeholder={
							isMultiple(session.startDate)
								? MULTIPLE_STR
								: BLANK_STR
						}
						disabled={readOnly}
					/>
				</Col>
			</Form.Group>
			<Form.Group as={Row} className="mb-3" controlId="session-end">
				<Form.Label column>End:</Form.Label>
				<Col xs="auto">
					<Form.Control
						type="date"
						value={
							isMultiple(session.endDate) ? "" : session.endDate
						}
						onChange={(e) =>
							handleChange({ endDate: e.target.value })
						}
						placeholder={
							isMultiple(session.endDate)
								? MULTIPLE_STR
								: BLANK_STR
						}
						disabled={readOnly}
					/>
				</Col>
			</Form.Group>
			<Form.Group as={Row} className="mb-3" controlId="session-timezone">
				<Form.Label column>Time zone:</Form.Label>
				<Col xs="auto">
					<TimeZoneSelector
						style={{ width: 200 }}
						value={
							isMultiple(session.timezone) ? "" : session.timezone
						}
						onChange={(timezone) => handleChange({ timezone })}
						placeholder={
							isMultiple(session.timezone)
								? MULTIPLE_STR
								: BLANK_STR
						}
						readOnly={readOnly}
					/>
				</Col>
			</Form.Group>
			<Form.Group
				as={Row}
				className="mb-3"
				controlId="session-imat-meeting"
			>
				<Form.Label column>IMAT meeting:</Form.Label>
				<Col>
					<ImatMeetingSelector
						value={
							isMultiple(session.imatMeetingId)
								? null
								: session.imatMeetingId
						}
						onChange={(imatMeetingId) =>
							handleChange({ imatMeetingId })
						}
						placeholder={
							isMultiple(session.imatMeetingId)
								? MULTIPLE_STR
								: BLANK_STR
						}
						readOnly={readOnly}
					/>
				</Col>
			</Form.Group>
		</>
	);
}

function SessionEdit({
	session,
	updateSession,
	readOnly,
}: {
	session: MultipleSession;
	updateSession: (changes: Partial<Session>) => void;
	readOnly?: boolean;
}) {
	const dispatch = useAppDispatch();
	const uiProperties = useAppSelector(selectSessionsState).ui;

	const isSession =
		(session.type === "p" || session.type === "i") &&
		!isMultiple(session.id);

	return (
		<div className="main">
			<SessionBasics
				session={session}
				updateSession={updateSession}
				readOnly={readOnly || !uiProperties.editEnabled}
			/>
			{isSession && (
				<Tabs
					onSelect={(tabIndex) => {
						dispatch(setUiProperties({ tabIndex }));
					}}
					activeKey={uiProperties.tabIndex || 0}
				>
					<Tab title="Rooms" eventKey={0}>
						<RoomDetails
							rooms={(session as Session).rooms || []}
							setRooms={(rooms) => updateSession({ rooms })}
							readOnly={readOnly}
						/>
					</Tab>
					<Tab title="Timeslots" eventKey={1}>
						<TimeslotDetails
							timeslots={(session as Session).timeslots || []}
							setTimeslots={(timeslots) =>
								updateSession({ timeslots })
							}
							readOnly={readOnly}
						/>
					</Tab>
					<Tab title="Credit" eventKey={2}>
						<SessionCredit
							session={session as Session}
							updateSession={updateSession}
							readOnly={readOnly}
						/>
					</Tab>
				</Tabs>
			)}
		</div>
	);
}

const Placeholder = (props: React.ComponentProps<"span">) => (
	<div className="placeholder">
		<span {...props} />
	</div>
);

export type MultipleSession = Multiple<Session>;

type SessionDetailState = {
	saved: MultipleSession;
	edited: MultipleSession;
	ids: EntityId[];
};

type SessionDetailInternalProps = ConnectedSessionDetailProps & {
	readOnly?: boolean;
};

class SessionDetail extends React.Component<
	SessionDetailInternalProps,
	SessionDetailState
> {
	constructor(props: SessionDetailInternalProps) {
		super(props);
		this.state = this.initState(props);
		this.triggerSave = debounce(this.save, 500);
	}
	triggerSave: ReturnType<typeof debounce>;

	componentWillUnmount() {
		this.triggerSave.flush();
	}

	componentDidUpdate(prevProps: SessionDetailInternalProps) {
		const { props } = this;
		if (props.selected.join() !== prevProps.selected.join()) {
			this.triggerSave.flush();
			this.setState(this.initState(props));
		}
	}

	initState = (props: SessionDetailInternalProps) => {
		const { sessionEntities, selected } = props;
		const sessions = selected
			.map((id) => sessionEntities[id]!)
			.filter((s) => Boolean(s));
		const diff: MultipleSession = sessions.reduce(
			(diff, s) => deepMergeTagMultiple(diff, s),
			{} as MultipleSession
		);
		return {
			saved: diff,
			edited: diff,
			ids: sessions.map((s) => s.id),
		};
	};

	updateSession = (changes: Partial<Session>) => {
		const { readOnly, uiProperties } = this.props;
		if (readOnly || !uiProperties.editEnabled) {
			console.warn("Update in read-only component");
			return;
		}
		this.setState(
			(state) => ({ ...state, edited: { ...state.edited, ...changes } }),
			this.triggerSave
		);
	};

	save = () => {
		const { updateSession } = this.props;
		const { edited, saved, ids } = this.state;

		const changes = shallowDiff(saved, edited) as Partial<Session>;

		if (
			("startDate" in changes &&
				!DateTime.fromISO(changes.startDate!).isValid) ||
			("endDate" in changes &&
				!DateTime.fromISO(changes.endDate!).isValid)
		) {
			return; // wait for further changes
		}

		if (Object.keys(changes).length > 0)
			ids.forEach((id) => updateSession(id, changes));

		this.setState((state) => ({ ...state, saved: edited }));
	};

	add = async () => {
		const { addSession, setSelected } = this.props;
		const id = await addSession(defaultSession);
		if (id) setSelected([id]);
	};

	handleRemoveSelected = async () => {
		const { selected, deleteSessions } = this.props;
		const ok = await ConfirmModal.show(
			"Are you sure you want to delete the selected sessions?"
		);
		if (ok) await deleteSessions(selected);
	};

	handleToggleEditEnabled = () =>
		this.props.setUiProperties({
			editEnabled: !this.props.uiProperties.editEnabled,
		});

	render() {
		const { loading, uiProperties, access } = this.props;
		const { edited, ids } = this.state;

		let notAvailableStr;
		if (loading) notAvailableStr = "Loading...";
		else if (ids.length === 0) notAvailableStr = "Nothing selected";
		const disableButtons = !!notAvailableStr; // disable buttons if displaying string

		const readOnly = access <= AccessLevel.ro;

		return (
			<>
				<div className="top-row justify-right gap-2">
					{!readOnly && (
						<>
							<Button
								variant="outline-primary"
								className="bi-pencil"
								title="Edit session"
								disabled={disableButtons}
								active={uiProperties.editEnabled || readOnly}
								onClick={this.handleToggleEditEnabled}
							/>
							<Button
								variant="outline-primary"
								className="bi-plus-lg"
								title="Add a session"
								disabled={!uiProperties.editEnabled}
								onClick={this.add}
							/>
							<Button
								variant="outline-primary"
								className="bi-trash"
								title="Delete session"
								disabled={
									disableButtons ||
									!uiProperties.editEnabled ||
									readOnly
								}
								onClick={this.handleRemoveSelected}
							/>
						</>
					)}
				</div>
				{notAvailableStr ? (
					<Placeholder>{notAvailableStr}</Placeholder>
				) : (
					<SessionEdit
						session={edited}
						updateSession={this.updateSession}
						readOnly={readOnly || !uiProperties.editEnabled}
					/>
				)}
				<ShowAccess access={access} />
			</>
		);
	}
}

const connector = connect(
	(state: RootState) => {
		const sessions = selectSessionsState(state);
		return {
			sessionEntities: sessions.entities,
			loading: sessions.loading,
			selected: sessions.selected,
			uiProperties: sessions.ui,
			access: selectUserSessionsAccess(state),
		};
	},
	{
		loadSessions,
		updateSession,
		deleteSessions,
		addSession,
		setSelected,
		setUiProperties,
	}
);

type ConnectedSessionDetailProps = ConnectedProps<typeof connector>;

const ConnectedSessionDetail = connector(SessionDetail);

export default ConnectedSessionDetail;
