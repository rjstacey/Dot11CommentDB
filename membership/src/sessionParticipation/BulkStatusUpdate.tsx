import * as React from "react";
import type { EntityId, Dictionary } from "@reduxjs/toolkit";

import {
	Form,
	Row,
	Field,
	Input,
	Checkbox,
	Button,
	Dropdown,
	type DropdownRendererProps,
} from "dot11-components";

import type { RootState } from "../store";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { updateMembers, type MemberUpdate } from "../store/members";
import {
	selectMostRecentAttendedSession,
	selectAttendancesState,
	selectAttendancesWithMembershipAndSummary,
	type MemberAttendances,
} from "../store/sessionParticipation";
import {
	selectMostRecentBallotSeries,
	selectBallotParticipationState,
	selectBallotParticipationWithMembershipAndSummary,
	selectBallotEntities,
	type MemberParticipation,
} from "../store/ballotParticipation";

function selectEntriesAndDefaults(
	state: RootState,
	isSession: boolean,
	selectedOnly: boolean
) {
	let ids: EntityId[], selected: EntityId[];
	let entities:
		| Dictionary<MemberParticipation>
		| Dictionary<MemberAttendances>;
	let defaultReason: string, defaultDate: string;
	if (isSession) {
		const recentSession = selectMostRecentAttendedSession(state);
		defaultReason = `Post session ${
			recentSession.number || `id=${recentSession.id}`
		} update`;
		defaultDate = recentSession.endDate;
		const attendencesState = selectAttendancesState(state);
		ids = attendencesState.ids;
		selected = attendencesState.selected;
		entities = selectAttendancesWithMembershipAndSummary(state);
	} else {
		const recentBallotSeries = selectMostRecentBallotSeries(state);
		const ballotEntities = selectBallotEntities(state);
		const ballotId =
			recentBallotSeries.ballotIds[
				recentBallotSeries.ballotIds.length - 1
			];
		const lastBallot = ballotEntities[ballotId];
		defaultReason = `Post ballot ${lastBallot?.BallotID || ""} update`;
		defaultDate = recentBallotSeries.end.slice(0, 10);
		const ballotParticipationState = selectBallotParticipationState(state);
		ids = ballotParticipationState.ids;
		selected = ballotParticipationState.selected;
		entities = selectBallotParticipationWithMembershipAndSummary(state);
	}
	const entries = (selectedOnly ? selected : ids)
		.map((id) => entities[id]!)
		.filter((a) => a.ExpectedStatus);

	return {
		defaultReason,
		defaultDate,
		entries,
	};
}

function BulkStatusUpdateForm({
	methods,
	isSession,
}: DropdownRendererProps & { isSession: boolean }) {
	const dispatch = useAppDispatch();
	const [selectedOnly, setSelectedOnly] = React.useState(false);
	const { defaultReason, defaultDate, entries } = useAppSelector((state) =>
		selectEntriesAndDefaults(state, isSession, selectedOnly)
	);
	const [reason, setReason] = React.useState(defaultReason);
	const [date, setDate] = React.useState(defaultDate);
	const [busy, setBusy] = React.useState(false);

	const updates: MemberUpdate[] = entries.map((a) => ({
		id: a.SAPIN,
		changes: {
			Status: a.ExpectedStatus,
			StatusChangeReason: reason,
			StatusChangeDate: date,
		},
	}));

	let warning = `${updates.length} updates`;

	const submit = async () => {
		setBusy(true);
		await dispatch(updateMembers(updates));
		setBusy(false);
		methods.close();
	};

	return (
		<Form
			title="Bulk status update"
			submit={submit}
			cancel={methods.close}
			busy={busy}
			errorText={warning}
		>
			<Row>Updated member status to expected status</Row>
			<Row>
				<Field label="Only selected entries:">
					<Checkbox
						size={24}
						checked={selectedOnly}
						onChange={() => setSelectedOnly(!selectedOnly)}
					/>
				</Field>
			</Row>
			<Row>
				<Field label="Reason:">
					<Input
						type="text"
						size={24}
						value={reason}
						onChange={(e) => setReason(e.target.value)}
					/>
				</Field>
			</Row>
			<Row>
				<Field label="Date:">
					<Input
						type="date"
						size={24}
						value={date}
						onChange={(e) => setDate(e.target.value)}
					/>
				</Field>
			</Row>
		</Form>
	);
}

const label = "Bulk Status Update";
const title = label;

type BulkStatusUpdateProps = {
	disabled?: boolean;
	isSession: boolean;
} & React.ComponentProps<typeof Dropdown>;

const BulkStatusUpdate = ({
	disabled,
	isSession,
	...rest
}: BulkStatusUpdateProps) => (
	<Dropdown
		handle={false}
		selectRenderer={({ state, methods }) => (
			<Button
				title={title}
				disabled={disabled}
				isActive={state.isOpen}
				onClick={state.isOpen ? methods.close : methods.open}
			>
				{label}
			</Button>
		)}
		dropdownRenderer={(props) => (
			<BulkStatusUpdateForm {...props} isSession={isSession} />
		)}
		{...rest}
	/>
);

export default BulkStatusUpdate;
