import * as React from "react";
import type { EntityId, Dictionary } from "@reduxjs/toolkit";
import { DateTime } from "luxon";
import { Form, Row, Col, Button, Dropdown, Spinner } from "react-bootstrap";

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
	defaultReason,
	defaultDate,
	ids,
	selected,
	entities,
	close,
}: {
	defaultReason: string;
	defaultDate: string;
	ids: EntityId[];
	selected: EntityId[];
	entities: Dictionary<StatusFromParticipationType>;
	close: () => void;
}) {
	const dispatch = useAppDispatch();
	const [selectedOnly, setSelectedOnly] = React.useState(true);
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

	const warning = `${updates.length} update${
		updates.length !== 1 ? "s" : ""
	}`;

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setBusy(true);
		await dispatch(updateMembers(updates));
		setBusy(false);
		close();
	}

	return (
		<Form
			title="Bulk status update"
			onSubmit={handleSubmit}
			className="p-3"
		>
			<Row>
				<p className="text-primary">
					Updated status to expected status
				</p>
			</Row>
			<Form.Group as={Row} className="mb-3 align-items-center">
				<Form.Label column sm={8}>
					Only selected entries:
				</Form.Label>
				<Col>
					<Form.Check
						checked={selectedOnly}
						onChange={() => setSelectedOnly(!selectedOnly)}
					/>
				</Col>
			</Form.Group>
			<Form.Group as={Row} className="mb-3">
				<Form.Label column sm={3}>
					Reason:
				</Form.Label>
				<Col>
					<Form.Control
						type="text"
						value={reason}
						onChange={(e) => setReason(e.target.value)}
					/>
				</Col>
			</Form.Group>
			<Form.Group as={Row} className="mb-3">
				<Form.Label column sm={3}>
					Date:
				</Form.Label>
				<Col>
					<Form.Control
						type="date"
						value={date}
						onChange={(e) => setDate(e.target.value)}
					/>
				</Col>
			</Form.Group>
			<Row className="mb-3">
				<p className="text-warning text-end">{warning}</p>
			</Row>
			<Row>
				<Col className="d-flex justify-content-end">
					<Button type="submit">
						{busy && <Spinner animation="border" size="sm" />}
						<span>Update</span>
					</Button>
				</Col>
			</Row>
		</Form>
	);
}

function BulkStatusUpdateFormSession({ close }: { close: () => void }) {
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
			defaultReason={defaultReason}
			defaultDate={defaultDate}
			ids={ids}
			selected={selected}
			entities={entities}
			close={close}
		/>
	);
}

function BulkStatusUpdateFormBallotSeries({ close }: { close: () => void }) {
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
			defaultReason={defaultReason}
			defaultDate={defaultDate}
			ids={ids}
			selected={selected}
			entities={entities}
			close={close}
		/>
	);
}

export function BulkStatusUpdate({
	disabled,
	isSession,
}: {
	disabled?: boolean;
	isSession: boolean;
}) {
	const [show, setShow] = React.useState(false);
	return (
		<Dropdown align="end" show={show} onToggle={() => setShow(!show)}>
			<Dropdown.Toggle variant="success-outline" disabled={disabled}>
				Bulk Status Update
			</Dropdown.Toggle>
			<Dropdown.Menu style={{ width: 400 }}>
				{isSession ? (
					<BulkStatusUpdateFormSession close={() => setShow(false)} />
				) : (
					<BulkStatusUpdateFormBallotSeries
						close={() => setShow(false)}
					/>
				)}
			</Dropdown.Menu>
		</Dropdown>
	);
}
