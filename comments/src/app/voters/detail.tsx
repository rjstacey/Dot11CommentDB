import React from "react";
import { Container, Row, Col, Button } from "react-bootstrap";
import { useAppSelector } from "@/store/hooks";
import { selectBallotsAccess, AccessLevel } from "@/store/ballots";
import { selectIsOnline } from "@/store/offline";

import { VoterEditForm } from "./VoterEditForm";
import ShowAccess from "@/components/ShowAccess";
import { useVotersEdit } from "@/hooks/votersEdit";

const Placeholder = (props: React.ComponentProps<"span">) => (
	<div className="details-panel-placeholder">
		<span {...props} />
	</div>
);

export function VotersDetail() {
	const access = useAppSelector(selectBallotsAccess);
	const readOnly = access <= AccessLevel.ro;
	const isOnline = useAppSelector(selectIsOnline);

	const { state, hasChanges, onChange, submit, cancel, onAdd, onDelete } =
		useVotersEdit(readOnly);

	let title = "Voter";
	let content: React.ReactNode;
	if (state.action === "add" || state.action === "update") {
		if (state.action === "add") title = "Add voter";
		else if (hasChanges()) title = "Update voter";
		content = (
			<VoterEditForm
				action={state.action}
				voter={state.edited}
				hasChanges={hasChanges}
				onChange={onChange}
				submit={submit}
				cancel={cancel}
				readOnly={readOnly}
			/>
		);
	} else {
		content = <Placeholder>{state.message}</Placeholder>;
	}

	const actionButtons = readOnly ? null : (
		<>
			<Button
				variant="outline-primary"
				className="bi-plus-lg"
				title="Add ballot"
				disabled={!isOnline}
				active={state.action === "add"}
				onClick={onAdd}
			>
				{" Add"}
			</Button>
			<Button
				variant="outline-primary"
				className="bi-trash"
				title="Delete ballot"
				disabled={state.action !== "update" || !isOnline}
				onClick={onDelete}
			>
				{" Delete"}
			</Button>
		</>
	);

	return (
		<Container fluid style={{ maxWidth: 860 }}>
			<Row className="align-items-center mb-3">
				<Col>
					<h3 className="title">{title}</h3>
				</Col>
				<Col xs="auto" className="d-flex gap-2">
					{actionButtons}
				</Col>
			</Row>
			{content}
			<ShowAccess access={access} />
		</Container>
	);
}
