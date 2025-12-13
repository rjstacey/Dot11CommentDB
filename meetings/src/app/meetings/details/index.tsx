import * as React from "react";
import { Row, Col, Button, Container } from "react-bootstrap";
import { useAppSelector } from "@/store/hooks";
import { selectUserMeetingsAccess, AccessLevel } from "@/store/meetings";

import ShowAccess from "@/components/ShowAccess";
import { MeetingsEditForm } from "./MeetingsEditForm";
import { useMeetingsEdit } from "@/edit/meetingsEdit";
import { isSessionMeeting } from "@/edit/convertMeetingEntry";

export function MeetingsDetails() {
	const access = useAppSelector(selectUserMeetingsAccess);
	const readOnly = access <= AccessLevel.ro;

	const {
		state,
		hasChanges,
		onChange,
		submit,
		cancel,
		onSync,
		onAdd,
		onDelete,
	} = useMeetingsEdit(readOnly);

	let title = isSessionMeeting(state.session) ? "Session meeting" : "Telecon";
	if (state.action === "add-by-slot") {
		title = "Add session meeting to selected slots";
	} else if (state.action === "add-by-date") {
		title = state.edited.isSessionMeeting
			? "Add session meeting"
			: "Add telecon";
	} else if (state.action === "update") {
		if (hasChanges())
			title = state.edited.isSessionMeeting
				? "Update session meeting"
				: "Update telecon";
	}

	const actionButtons = (
		<Col
			xs="auto"
			className="d-flex justify-content-end align-items-center gap-2"
		>
			<Button
				variant="outline-primary"
				className="bi-cloud-upload"
				title="Sync meeting"
				disabled={
					state.action !== "update" ||
					state.meetings.length === 0 ||
					readOnly
				}
				onClick={onSync}
			>
				{" Sync"}
			</Button>
			<Button
				variant="outline-primary"
				className="bi-plus-lg"
				title="Add meeting"
				disabled={state.action === "add-by-slot" || readOnly}
				active={state.action === "add-by-date"}
				onClick={onAdd}
			>
				{" Add"}
			</Button>
			<Button
				variant="outline-primary"
				className="bi-trash"
				title="Delete meeting"
				disabled={
					state.action !== "update" ||
					state.meetings.length === 0 ||
					readOnly
				}
				onClick={onDelete}
			>
				{" Delete"}
			</Button>
		</Col>
	);

	let content: React.ReactNode;
	if (state.action === null) {
		content = <div className="placeholder">{state.message}</div>;
	} else {
		content = (
			<MeetingsEditForm
				action={state.action}
				entry={state.edited}
				session={state.session}
				onChange={onChange}
				hasChanges={hasChanges}
				submit={submit}
				cancel={cancel}
				readOnly={readOnly}
			/>
		);
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
			<ShowAccess access={access} />
		</Container>
	);
}
