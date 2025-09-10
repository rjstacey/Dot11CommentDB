import { Row, Col, Form } from "react-bootstrap";
import { isMultiple, Multiple } from "@common";

import { Ballot, BallotChange } from "@/store/ballots";

import SelectProject from "./ProjectSelector";

const BLANK_STR = "(Blank)";
const MULTIPLE_STR = "(Multiple)";

export function BallotProjectRow({
	ballot,
	updateBallot,
	readOnly,
}: {
	ballot: Multiple<Ballot>;
	updateBallot: (changes: BallotChange) => void;
	readOnly?: boolean;
}) {
	return (
		<Form.Group as={Row} className="mb-3">
			<Form.Label htmlFor="ballot-project" column>
				Project:
			</Form.Label>
			<Col className="position-relative">
				<SelectProject
					id="ballot-project"
					value={isMultiple(ballot.Project) ? "" : ballot.Project}
					onChange={(Project) => updateBallot({ Project })}
					groupId={isMultiple(ballot.groupId) ? null : ballot.groupId}
					placeholder={
						isMultiple(ballot.Project) ? MULTIPLE_STR : BLANK_STR
					}
					readOnly={readOnly}
					isInvalid={!ballot.Project && !isMultiple(ballot.Project)}
				/>
				<Form.Control.Feedback type="invalid" tooltip>
					Select and existing or add a new project (e.g., P802.11bn)
				</Form.Control.Feedback>
			</Col>
			<Col>
				<Form.Text className="text-muted">
					The project for this ballot
				</Form.Text>
			</Col>
		</Form.Group>
	);
}
