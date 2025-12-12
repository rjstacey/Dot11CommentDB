import * as React from "react";
import { Button, Container, Row, Col } from "react-bootstrap";

import { useAppSelector } from "@/store/hooks";
import { selectUserMeetingsAccess, AccessLevel } from "@/store/meetings";

import { MeetingsEditForm } from "../meetings/details/MeetingsEditForm";
import { BreakoutEditForm } from "./BreakoutEditForm";
import { useImatBreakoutsEdit } from "@/edit/imatBreakoutsEdit";

/*
type Action = "add" | "update" | "import";

type MultipleBreakoutEntry = Multiple<SyncedBreakout>;

type BreakoutEntryChanges = Partial<SyncedBreakout>;

type BreakoutDetailsCommonState = {
	imatMeetingId: number | null;
	breakouts: SyncedBreakout[];
	busy: boolean;
};

// action "add" => add a breakout
type BreakoutDetailsAddState = {
	action: "add";
	entry: SyncedBreakout;
	saved: SyncedBreakout;
} & BreakoutDetailsCommonState;

// action "import" => import breakout as a meeting
type BreakoutDetailsImportState = {
	action: "import";
	entry: MeetingEntryMultiple;
	saved: MeetingEntryMultiple;
} & BreakoutDetailsCommonState;

// action "update" => view or update one or more entries
type BreakoutDetailsUpdateState = {
	action: "update";
	entry: MultipleBreakoutEntry;
	saved: MultipleBreakoutEntry;
} & BreakoutDetailsCommonState;

type BreakoutDetailsState =
	| BreakoutDetailsAddState
	| BreakoutDetailsImportState
	| BreakoutDetailsUpdateState;


class BreakoutDetails extends React.Component<
	BreakoutDetailsConnectedProps,
	BreakoutDetailsState
> {
	constructor(props: BreakoutDetailsConnectedProps) {
		super(props);
		this.state = this.initState("update");
	}

	componentDidUpdate() {
		const { selected, setSelected } = this.props;
		const { action, breakouts } = this.state;
		const ids = breakouts.map((b) => b.id);

		const changeWithConfirmation = async () => {
			if (action === "update" && this.hasUpdates()) {
				const ok = await ConfirmModal.show(
					"Changes not applied! Do you want to discard changes?"
				);
				if (!ok) {
					setSelected(ids);
					return;
				}
			}
			this.reinitState("update");
		};

		if (selected.join() !== ids.join()) changeWithConfirmation();
	}

	initState = (action: Action): BreakoutDetailsState => {
		const {
			entities,
			selected,
			imatMeetingId,
			imatMeeting,
			session,
			groupId,
			groupEntities,
		} = this.props;

		if (action === "add") {
			const entry: SyncedBreakout = {
				...getDefaultBreakout(),
				imatMeetingId,
				meetingId: null,
			};
			return {
				action,
				entry,
				saved: entry,
				imatMeetingId,
				breakouts: [],
				busy: false,
			};
		} else if (action === "import") {
			const id = selected[0];
			const breakout = entities[id]!;
			const entry = convertBreakoutToMeetingEntry(
				breakout,
				imatMeeting!,
				session!,
				groupId,
				groupEntities
			);
			return {
				action,
				entry,
				saved: entry,
				imatMeetingId,
				breakouts: [breakout],
				busy: false,
			};
		} else {
			const breakouts = selected
				.map((id) => entities[id]!)
				.filter(Boolean);
			const entry = breakouts.reduce(
				(entry, breakout) => deepMergeTagMultiple(entry, breakout),
				{}
			) as MultipleBreakoutEntry;
			return {
				action,
				entry,
				saved: entry,
				imatMeetingId,
				breakouts,
				busy: false,
			};
		}
	};

	reinitState = (action: Action) => {
		this.setState(this.initState(action));
	};

	getUpdates = () => {
		// Only called when action === "update"
		const { entry, saved, imatMeetingId, breakouts } = this
			.state as BreakoutDetailsUpdateState;

		// Find differences
		const diff = deepDiff(saved, entry) || {};
		const breakoutUpdates: SyncedBreakout[] = [],
			meetingUpdates: {
				id: number;
				changes: {
					imatMeetingId: number | null;
					imatBreakoutId: number;
				};
			}[] = [];
		for (const breakout of breakouts) {
			const updated: SyncedBreakout = deepMerge(breakout, diff);
			const changes: Partial<SyncedBreakout> =
				deepDiff(breakout, updated) || {};
			if (changes.meetingId) {
				meetingUpdates.push({
					id: changes.meetingId,
					changes: { imatMeetingId, imatBreakoutId: breakout.id },
				});
				delete changes.meetingId;
			}
			if (Object.keys(changes).length > 0) {
				breakoutUpdates.push(updated);
			}
		}
		return { breakoutUpdates, meetingUpdates };
	};

	hasUpdates = () => this.state.saved !== this.state.entry;

	changeBreakoutEntry = (changes: BreakoutEntryChanges) => {
		this.setState((addUpdateState) => {
			const state = addUpdateState as
				| BreakoutDetailsAddState
				| BreakoutDetailsUpdateState;
			let entry = { ...state.entry, ...changes };
			const diff = deepDiff(state.saved, entry) || {};
			if (Object.keys(diff).length === 0) entry = state.saved;
			return { ...state, entry };
		});
	};

	changeMeetingEntry = (changes: MeetingEntryPartial) => {
		this.setState((importState) => {
			const state = importState as BreakoutDetailsImportState;
			let entry = deepMerge(state.entry, changes) as MeetingEntryMultiple;
			const diff = deepDiff(state.saved, entry) || {};
			if (Object.keys(diff).length === 0) entry = state.saved;
			return { ...state, entry };
		});
	};

	clickAdd = async () => {
		const { setSelected } = this.props;
		const { action } = this.state;

		if (action === "update" && this.hasUpdates()) {
			const ok = await ConfirmModal.show(
				`Changes not applied! Do you want to discard changes?`
			);
			if (!ok) return;
		}

		setSelected([]);
		this.reinitState("add");
	};

	clickDelete = async () => {
		const { deleteBreakouts } = this.props;
		const { imatMeetingId, breakouts } = this.state;

		const ids = breakouts.map((b) => b.id);
		const ok = await ConfirmModal.show(
			"Are you sure you want to delete the " +
				(ids.length > 1
					? ids.length + " selected entries?"
					: "selected entry?")
		);
		if (!ok) return;
		await deleteBreakouts(imatMeetingId!, ids);
		this.reinitState("update");
	};

	clickImport = () => {
		this.reinitState("import");
	};

	add = async () => {
		const { addBreakouts, updateMeetings, setSelected } = this.props;
		const { entry, imatMeetingId } = this.state as BreakoutDetailsAddState;

		this.setState({ busy: true });
		const [id] = await addBreakouts(imatMeetingId!, [entry]);
		if (entry.meetingId)
			await updateMeetings([
				{
					id: entry.meetingId,
					changes: { imatMeetingId, imatBreakoutId: id },
				},
			]);
		setSelected([id]);
		this.reinitState("update");
	};

	update = async () => {
		const { updateBreakouts, updateMeetings } = this.props;
		const { imatMeetingId } = this.state;

		const { breakoutUpdates, meetingUpdates } = this.getUpdates();
		//console.log(updates)

		this.setState({ busy: true });
		if (breakoutUpdates.length > 0)
			await updateBreakouts(imatMeetingId!, breakoutUpdates);
		if (meetingUpdates.length > 0) await updateMeetings(meetingUpdates);
		this.reinitState("update");
	};

	import = async () => {
		const { addMeetings, session } = this.props;
		let { entry } = this.state as BreakoutDetailsImportState;

		// If a webex account is given, then add a webex meeting
		if (entry.webexAccountId) {
			entry = { ...entry, webexMeetingId: "$add" };
			if (entry.webexMeeting) entry.webexMeeting.publicMeeting = false;
		}

		const { dates, ...rest } = entry;
		const meetings = dates.map((date) =>
			convertEntryToMeeting({ ...rest, date } as MeetingEntry, session)
		);
		//console.log(meetings);

		this.setState({ busy: true });
		await addMeetings(meetings);
		this.reinitState("update");
	};

	cancel = () => {
		this.reinitState("update");
	};

	render() {
		const { loading, access } = this.props;
		const { action, entry, breakouts, busy } = this.state;

		let notAvailableStr = "";
		if (loading) notAvailableStr = "Loading...";
		else if (action === "update" && breakouts.length === 0)
			notAvailableStr = "Nothing selected";

		let submit, cancel;
		let title = "";
		if (!notAvailableStr) title = "Breakout";
		if (action === "import") {
			submit = this.import;
			cancel = this.cancel;
			title = "Import as meeting";
		} else if (action === "add") {
			submit = this.add;
			cancel = this.cancel;
			title = "Add breakout";
		} else if (this.hasUpdates()) {
			submit = this.update;
			cancel = this.cancel;
			title = "Update breakout";
		}

		const readOnly = access <= AccessLevel.ro;

		const actionButtons = (
			<Col xs="auto" className="d-flex align-items-center gap-2">
				<Spinner
					animation="border"
					role="status"
					size="sm"
					hidden={!busy && !loading}
				/>
				<Button
					variant="outline-primary"
					className="bi-cloud-download"
					title="Import as meeting"
					disabled={loading || busy || readOnly}
					onClick={this.clickImport}
				>
					{" Import as meeting"}
				</Button>
				<Button
					variant="outline-primary"
					className="bi-plus-lg"
					title="Add breakout"
					disabled={loading || busy || readOnly}
					active={action === "add"}
					onClick={this.clickAdd}
				>
					{" Add breakout"}
				</Button>
				<Button
					variant="outline-primary"
					className="bi-trash"
					title="Delete breakout"
					disabled={
						loading || breakouts.length === 0 || busy || readOnly
					}
					onClick={this.clickDelete}
				>
					{" Delete breakout"}
				</Button>
			</Col>
		);

		return (
			<Container fluid>
				<Row className="mb-3">
					<Col>
						<h3 className="title">{title}</h3>
					</Col>
					{actionButtons}
				</Row>
				{notAvailableStr ? (
					<div className="placeholder">{notAvailableStr}</div>
				) : action === "import" ? (
					<MeetingsEditForm
						entry={entry}
						changeEntry={this.changeMeetingEntry}
						action="add-by-date"
						submit={this.add}
						cancel={this.cancel}
						hasChanges={() => true}
					/>
				) : (
					<BreakoutEntryForm
						entry={entry}
						changeEntry={this.changeBreakoutEntry}
						busy={busy}
						action={action}
						submit={submit}
						cancel={cancel}
						readOnly={readOnly}
					/>
				)}
			</Container>
		);
	}
}

const connector = connect(
	(state: RootState) => ({
		imatMeetingId: selectBreakoutMeetingId(state),
		imatMeeting: selectBreakoutMeeting(state),
		timeslots: selectBreakoutsState(state).timeslots,
		loading: selectBreakoutsState(state).loading,
		selected: selectBreakoutsState(state).selected,
		entities: selectSyncedBreakoutEntities(state),
		session: selectCurrentSession(state),
		groupId: selectTopLevelGroupId(state)!,
		groupEntities: selectGroupEntities(state),
		access: selectUserMeetingsAccess(state),
	}),
	{
		setSelected: setSelectedBreakouts,
		updateBreakouts,
		addBreakouts,
		deleteBreakouts,
		updateMeetings,
		addMeetings,
	}
);

type BreakoutDetailsConnectedProps = ConnectedProps<typeof connector>;

const ConnectedBreakoutDetails = connector(BreakoutDetails);

export default ConnectedBreakoutDetails;
*/

export function ImatBreakoutsDetails() {
	const access = useAppSelector(selectUserMeetingsAccess);
	const readOnly = access <= AccessLevel.ro;
	const {
		state,
		onAdd,
		onDelete,
		onImport,
		onChangeMeeting,
		onChangeBreakout,
		hasChanges,
		submit,
		cancel,
	} = useImatBreakoutsEdit(readOnly);

	const actionButtons = (
		<Col xs="auto" className="d-flex align-items-center gap-2">
			<Button
				variant="outline-primary"
				className="bi-cloud-download"
				title="Import as meeting"
				disabled={readOnly}
				onClick={onImport}
			>
				{" Import as meeting"}
			</Button>
			<Button
				variant="outline-primary"
				className="bi-plus-lg"
				title="Add breakout"
				disabled={readOnly}
				active={state.action === "add"}
				onClick={onAdd}
			>
				{" Add breakout"}
			</Button>
			<Button
				variant="outline-primary"
				className="bi-trash"
				title="Delete breakout"
				disabled={state.breakouts.length === 0 || readOnly}
				onClick={onDelete}
			>
				{" Delete breakout"}
			</Button>
		</Col>
	);

	let title = "Breakout";
	let content: React.ReactNode;
	if (state.action === "import") {
		title = "Import as meeting";
		content = (
			<MeetingsEditForm
				action="add-by-date"
				entry={state.edited}
				session={state.session}
				onChange={onChangeMeeting}
				hasChanges={hasChanges}
				submit={submit}
				cancel={cancel}
				readOnly={readOnly}
			/>
		);
	} else if (state.action === "add" || state.action === "update") {
		if (state.action === "add") title = "Add breakout";
		else if (hasChanges()) title = "Update breakout";
		content = (
			<BreakoutEditForm
				action={state.action}
				entry={state.edited}
				onChange={onChangeBreakout}
				hasChanges={hasChanges}
				submit={submit}
				cancel={cancel}
				readOnly={readOnly}
			/>
		);
	} else {
		content = <div className="placeholder">{state.message}</div>;
	}

	return (
		<Container fluid>
			<Row className="mb-3">
				<Col>
					<h3 className="title">{title}</h3>
				</Col>
				{actionButtons}
			</Row>
			{content}
		</Container>
	);
}
