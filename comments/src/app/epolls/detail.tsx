import React from "react";
import { Container, Row, Col } from "react-bootstrap";
import { useAppSelector } from "@/store/hooks";
import { selectIsOnline } from "@/store/offline";
import { AccessLevel } from "@/store/groups";
import { selectBallotsAccess } from "@/store/ballots";
import { useEpollsEdit } from "@/hooks/epollsEdit";

import ShowAccess from "@/components/ShowAccess";
import { BallotAddForm } from "../ballots/details/BallotAddForm";
import { BallotEditForm } from "../ballots/details/BallotEditForm";

const Placeholder = (props: React.ComponentProps<"span">) => (
	<div className="details-panel-placeholder">
		<span {...props} />
	</div>
);

export function EpollsDetail() {
	const isOnline = useAppSelector(selectIsOnline);
	const access = useAppSelector(selectBallotsAccess);
	const readOnly = access < AccessLevel.admin;

	const { state, onChange, hasChanges, submit, cancel } =
		useEpollsEdit(readOnly);

	let title = "";
	let content: JSX.Element;
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
		else title = "Ballot";
		content = (
			<BallotEditForm
				edited={state.edited}
				saved={state.saved}
				hasChanges={hasChanges}
				onChange={onChange}
				submit={submit}
				cancel={cancel}
				readOnly={readOnly || !isOnline}
			/>
		);
	}

	return (
		<Container fluid style={{ maxWidth: 860 }}>
			<Row className="align-items-center justify-content-between mb-2">
				<Col>
					<h3 className="title">{title}</h3>
				</Col>
			</Row>
			{content}
			<ShowAccess access={access} />
		</Container>
	);
}
