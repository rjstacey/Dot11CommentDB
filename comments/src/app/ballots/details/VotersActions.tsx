import React from "react";
import { Link } from "react-router";
import { Row, Col, Form, DropdownButton } from "react-bootstrap";
import { VotersImportForm } from "../../voters/VotersImport";
import { useAppSelector } from "@/store/hooks";
import {
	getEncodedBallotId,
	selectBallotsWorkingGroup,
	Ballot,
	BallotType,
} from "@/store/ballots";

function VotersImportButton({ ballot }: { ballot: Ballot }) {
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
			/>
		</DropdownButton>
	);
}

function VotersActions({
	ballot,
	readOnly,
}: {
	ballot: Ballot;
	readOnly?: boolean;
}) {
	const workingGroup = useAppSelector(selectBallotsWorkingGroup)!;

	if (ballot.Type !== BallotType.WG) return null;

	return (
		<>
			<Row className="align-items-center mb-2">
				<Form.Label column xs="auto">
					Voters:
				</Form.Label>
				<Col xs="auto">
					<Link
						to={`/${workingGroup.name}/voters/${getEncodedBallotId(
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
						<VotersImportButton ballot={ballot} />
					</Col>
				)}
			</Row>
		</>
	);
}

export default VotersActions;
