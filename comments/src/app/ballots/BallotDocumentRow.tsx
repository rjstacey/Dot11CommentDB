import { Row, Col, Form } from "react-bootstrap";
import { isMultiple, Multiple } from "@common";
import { Ballot, BallotChange } from "@/store/ballots";
import { BLANK_STR, MULTIPLE_STR } from "@/components/constants";

export function BallotDocumentRow({
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
	const cn =
		original && original.Document !== ballot.Document ? "has-changes" : "";
	return (
		<Form.Group as={Row} controlId="ballot-document" className="mb-2">
			<Form.Label column>Document version:</Form.Label>
			<Col xs="auto">
				<Form.Control
					type="search"
					className={cn}
					name="Document"
					value={isMultiple(ballot.Document) ? "" : ballot.Document}
					placeholder={
						isMultiple(ballot.Document) ? MULTIPLE_STR : BLANK_STR
					}
					onChange={(e) =>
						updateBallot({ [e.target.name]: e.target.value })
					}
					readOnly={readOnly}
				/>
			</Col>
		</Form.Group>
	);
}
