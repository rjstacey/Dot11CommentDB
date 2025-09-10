import { Link } from "react-router";
import { Row, Col, Form, DropdownButton } from "react-bootstrap";
import { VotersImportForm } from "../voters/VotersImport";
import { useAppSelector } from "@/store/hooks";
import {
	getBallotId,
	selectBallotsWorkingGroup,
	Ballot,
} from "@/store/ballots";
import React from "react";

function VotersActions({
	ballot,
	readOnly,
}: {
	ballot: Ballot;
	readOnly?: boolean;
}) {
	const [show, setShow] = React.useState(false);
	const workingGroup = useAppSelector(selectBallotsWorkingGroup)!;

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
						<DropdownButton
							variant="light"
							title={ballot.Voters ? "Reimport" : "Import"}
							onToggle={() => setShow(!show)}
							show={show}
						>
							<VotersImportForm
								ballot={ballot}
								close={() => setShow(false)}
							/>
						</DropdownButton>
					</Col>
				)}
			</Row>
		</>
	);
}

export default VotersActions;
