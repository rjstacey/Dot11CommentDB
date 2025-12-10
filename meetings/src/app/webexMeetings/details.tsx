import * as React from "react";
import { Container, Row, Col, Button } from "react-bootstrap";
import {
	selectUserWebexMeetingsAccess,
	AccessLevel,
} from "@/store/webexMeetings";

import { WebexMeetingEditForm } from "./WebexMeetingEditForm";
import { useWebexMeetingsEdit } from "@/edit/webexMeetingsEdit";
import { useAppSelector } from "@/store/hooks";

export function WebexMeetingDetails() {
	const access = useAppSelector(selectUserWebexMeetingsAccess);
	const readOnly = access <= AccessLevel.ro;

	const { state, onChange, hasChanges, submit, cancel, onAdd, onDelete } =
		useWebexMeetingsEdit(readOnly);

	let content: React.ReactNode;
	let title = "Webex meeting";
	if (state.action === "add" || state.action === "update") {
		if (state.action === "add") title = "Add Webex meeting";
		else if (state.action === "update" && hasChanges())
			title = "Update Webex meeting";
		content = (
			<WebexMeetingEditForm
				action={state.action}
				entry={state.edited}
				onChange={onChange}
				hasChanges={hasChanges}
				submit={submit}
				cancel={cancel}
				readOnly={readOnly}
			/>
		);
	} else {
		content = <div className="placeholder">{state.message}</div>;
	}

	const actionButtons = (
		<Col
			xs="auto"
			className="d-flex justify-content-end align-items-center gap-2"
		>
			<Button
				variant="outline-primary"
				className="bi-plus-lg"
				title="Add Webex meeting"
				//disabled={loading || readOnly}
				onClick={onAdd}
			>
				{" Add"}
			</Button>
			<Button
				variant="outline-primary"
				className="bi-trash"
				title="Delete webex meeting"
				//disabled={loading || webexMeetings.length === 0 || readOnly}
				onClick={onDelete}
			>
				{" Delete"}
			</Button>
		</Col>
	);

	return (
		<Container fluid>
			<Row className="ps-3 pe-3">
				<Col>
					<h3 className="title">{title}</h3>
				</Col>
				{actionButtons}
			</Row>
			{content}
		</Container>
	);
}
