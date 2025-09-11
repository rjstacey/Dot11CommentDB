import { Row, Col, Form } from "react-bootstrap";
import { isMultiple, Multiple } from "@common";

import { Ballot, BallotChange } from "@/store/ballots";
import { BLANK_STR, MULTIPLE_STR } from "@/components/constants";

import SelectProject from "./ProjectSelector";

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
			<Col xs="auto" lassName="position-relative">
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
		</Form.Group>
	);
}
