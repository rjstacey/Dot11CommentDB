import React from "react";
import { Container, Row, Col, Button } from "react-bootstrap";

import { useAppSelector } from "@/store/hooks";
import { selectIsOnline } from "@/store/offline";

import { BallotEditForm } from "./BallotEditForm";
import { BallotAddForm } from "./BallotAddForm";
import ShowAccess from "@/components/ShowAccess";
import { useBallotsEdit } from "@/hooks/ballotsEdit";
import VotersActions from "./VotersActions";
import ResultsActions from "./ResultsActions";
import CommentsActions from "./CommentsActions";

const Placeholder = (props: React.ComponentProps<"span">) => (
	<div className="details-panel-placeholder">
		<span {...props} />
	</div>
);

export function BallotsDetail({
	access,
	readOnly,
}: {
	access: number;
	readOnly?: boolean;
}) {
	const isOnline = useAppSelector(selectIsOnline);
	const { state, onAdd, onDelete, onChange, hasChanges, submit, cancel } =
		useBallotsEdit(readOnly || false);

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
				disabled={state.ballots.length === 0 || !isOnline}
				onClick={onDelete}
			>
				{" Delete"}
			</Button>
		</>
	);

	let title = "Ballot";
	let content: React.ReactNode;
	if (state.action === null) {
		content = <Placeholder>{state.message}</Placeholder>;
	} else if (state.action === "add") {
		title = "Add Ballot";
		content = (
			<BallotAddForm
				edited={state.edited}
				onChange={onChange}
				submit={submit}
				cancel={cancel}
			/>
		);
	} else {
		if (hasChanges()) title = "Update Ballot";
		let ballotActions: React.ReactNode;
		if (state.ballots.length === 1) {
			const ballot = state.ballots[0];
			ballotActions = (
				<>
					<VotersActions ballot={ballot} readOnly={readOnly} />
					<ResultsActions ballot={ballot} readOnly={readOnly} />
					<CommentsActions ballot={ballot} readOnly={readOnly} />
				</>
			);
		}

		content = (
			<>
				<BallotEditForm
					edited={state.edited}
					saved={state.saved}
					hasChanges={hasChanges}
					onChange={onChange}
					submit={submit}
					cancel={cancel}
					readOnly={readOnly || !isOnline}
				/>
				{ballotActions}
			</>
		);
	}

	return (
		<Container fluid style={{ maxWidth: 860 }}>
			<Row className="align-items-center justify-content-between mb-2">
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
