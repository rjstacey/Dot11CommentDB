import React from "react";
import type { EntityId, Dictionary } from "@reduxjs/toolkit";
import { DateTime } from "luxon";

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

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
	updateMembers,
	MemberUpdate,
	StatusType,
	ExpectedStatusType,
} from "@/store/members";
import { selectMostRecentAttendedSession } from "@/store/sessions";
import {
	selectSessionParticipationSelected,
	selectSessionParticipationIds,
	selectSessionParticipationWithMembershipAndSummary,
} from "@/store/sessionParticipation";
import {
	getBallotId,
	selectMostRecentBallotSeries,
	selectBallotParticipationState,
	selectBallotParticipationWithMembershipAndSummary,
	selectBallotEntities,
} from "@/store/ballotParticipation";

type StatusFromParticipationType = {
	SAPIN: number;
	ExpectedStatus: ExpectedStatusType;
};

function BulkStatusUpdateForm({
	methods,
	defaultReason,
	defaultDate,
	ids,
	selected,
	entities,
}: DropdownRendererProps & {
	defaultReason: string;
	defaultDate: string;
	ids: EntityId[];
	selected: EntityId[];
	entities: Dictionary<StatusFromParticipationType>;
}) {
	const dispatch = useAppDispatch();
	const [selectedOnly, setSelectedOnly] = React.useState(false);
	const [reason, setReason] = React.useState(defaultReason);
	const [date, setDate] = React.useState(defaultDate);
	const [busy, setBusy] = React.useState(false);

	const updates: MemberUpdate[] = (selectedOnly ? selected : ids)
		.map((id) => entities[id])
		.filter((entity) => entity && entity.ExpectedStatus)
		.map((entity) => {
			const { SAPIN, ExpectedStatus } = entity!;
			const StatusChangeDate = DateTime.fromISO(date, {
				zone: "America/New_York",
			}).toISO()!;
			return {
				id: SAPIN,
				changes: {
					Status: ExpectedStatus as StatusType,
					StatusChangeReason: reason,
					StatusChangeDate,
				},
			} satisfies MemberUpdate;
		});

	const warning = `${updates.length} updates`;

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

function BulkStatusUpdateFormSession(props: DropdownRendererProps) {
	const recentSession = useAppSelector(selectMostRecentAttendedSession);
	const defaultReason = `Session ${
		recentSession.number || `id=${recentSession.id}`
	} update`;
	const defaultDate =
		DateTime.fromISO(recentSession.endDate, { zone: "America/New_York" })
			.plus({ days: 1 })
			.toISODate() || recentSession.endDate;
	const selected = useAppSelector(selectSessionParticipationSelected);
	const ids = useAppSelector(selectSessionParticipationIds);
	const entities = useAppSelector(
		selectSessionParticipationWithMembershipAndSummary
	);

	return (
		<BulkStatusUpdateForm
			{...props}
			defaultReason={defaultReason}
			defaultDate={defaultDate}
			ids={ids}
			selected={selected}
			entities={entities}
		/>
	);
}

function BulkStatusUpdateFormBallotSeries(props: DropdownRendererProps) {
	const recentBallotSeries = useAppSelector(selectMostRecentBallotSeries);
	const ballotEntities = useAppSelector(selectBallotEntities);
	const ballotId =
		recentBallotSeries.ballotIds[recentBallotSeries.ballotIds.length - 1];
	const lastBallot = ballotEntities[ballotId];
	const defaultReason = `Post ballot ${
		lastBallot ? getBallotId(lastBallot) : "Unknown"
	} update`;
	const defaultDate = recentBallotSeries.end.slice(0, 10);
	const { ids, selected } = useAppSelector(selectBallotParticipationState);
	const entities = useAppSelector(
		selectBallotParticipationWithMembershipAndSummary
	);

	return (
		<BulkStatusUpdateForm
			{...props}
			defaultReason={defaultReason}
			defaultDate={defaultDate}
			ids={ids}
			selected={selected}
			entities={entities}
		/>
	);
}
const label = "Bulk Status Update";
const title = label;

type BulkStatusUpdateProps = {
	disabled?: boolean;
	isSession: boolean;
} & React.ComponentProps<typeof Dropdown>;

export function BulkStatusUpdate({
	disabled,
	isSession,
	...rest
}: BulkStatusUpdateProps) {
	const dropdownRenderer = isSession
		? (props: DropdownRendererProps) => (
				<BulkStatusUpdateFormSession {...props} />
			)
		: (props: DropdownRendererProps) => (
				<BulkStatusUpdateFormBallotSeries {...props} />
			);

	return (
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
			dropdownRenderer={dropdownRenderer}
			{...rest}
		/>
	);
}
