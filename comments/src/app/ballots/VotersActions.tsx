import React from "react";
import { Link } from "react-router";
import { Row, Col, Form, DropdownButton } from "react-bootstrap";
import { VotersImportForm } from "../voters/VotersImport";
import { useAppSelector } from "@/store/hooks";
import {
	getBallotId,
	selectBallotsWorkingGroup,
	Ballot,
	BallotType,
} from "@/store/ballots";

function VotersImportButton({
	ballot,
	setBusy,
}: {
	ballot: Ballot;
	setBusy: (busy: boolean) => void;
}) {
	const [show, setShow] = React.useState(false);
	return (
		<DropdownButton
			variant="light"
			title={ballot.Voters ? "Replace voter pool" : "Create voter pool"}
			onToggle={() => setShow(!show)}
			show={show}
		>
			<VotersImportForm
				key={"voters-import-form-" + show} // Re-initialize with open
				ballot={ballot}
				close={() => setShow(false)}
				setBusy={setBusy}
			/>
		</DropdownButton>
	);
}

function VotersActions({
	ballot,
	readOnly,
	setBusy,
}: {
	ballot: Ballot;
	readOnly?: boolean;
	setBusy: (busy: boolean) => void;
}) {
	const workingGroup = useAppSelector(selectBallotsWorkingGroup)!;

	if (ballot.Type !== BallotType.WG) return null;

	return (
		<>
			<Row className="align-items-center mb-3">
				<Form.Label column xs="auto">
					Voters:
				</Form.Label>
				<Col xs="auto">
					<Link
						to={`/${workingGroup.name}/voters/${getBallotId(
							ballot
						)}`}
					>
						{ballot.Voters}
					</Link>
				</Col>
				{!readOnly && (
					<Col
						xs={12}
						className="d-flex flex-row flex-wrap justify-content-start gap-2"
					>
						<VotersImportButton ballot={ballot} setBusy={setBusy} />
					</Col>
				)}
			</Row>
		</>
	);
}

export default VotersActions;
