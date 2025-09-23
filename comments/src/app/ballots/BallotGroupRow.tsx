import { Row, Col, Form } from "react-bootstrap";
import { isMultiple, Multiple } from "@common";

import { Ballot, BallotChange } from "@/store/ballots";
import { BLANK_STR, MULTIPLE_STR } from "@/components/constants";

import SelectGroup from "./GroupSelector";

export function BallotGroupRow({
	ballot,
	original,
	updateBallot,
	readOnly,
}: {
	ballot: Multiple<Ballot>;
	original?: Multiple<Ballot>;
	updateBallot: (changes: BallotChange) => void;
	readOnly?: boolean;
}) {
	const hasChanges = original && original.groupId !== ballot.groupId;
	const cn = hasChanges ? "has-changes" : undefined;
	return (
		<Form.Group as={Row} className="align-items-center mb-2">
			<Form.Label htmlFor="ballot-group" column>
				Group:
			</Form.Label>
			<Col xs="auto" className="position-relative">
				<SelectGroup
					id="ballot-group"
					className={cn}
					style={{ width: 300 }}
					value={isMultiple(ballot.groupId) ? null : ballot.groupId}
					onChange={(groupId) =>
						updateBallot({ groupId: groupId || undefined })
					}
					placeholder={
						isMultiple(ballot.groupId) ? MULTIPLE_STR : BLANK_STR
					}
					readOnly={readOnly}
					isInvalid={!ballot.groupId && !isMultiple(ballot.groupId)}
				/>
				<Form.Control.Feedback type="invalid" tooltip>
					Select a group
				</Form.Control.Feedback>
			</Col>
		</Form.Group>
	);
}
