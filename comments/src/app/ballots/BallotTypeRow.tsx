import { Row, Col, Form } from "react-bootstrap";
import { isMultiple, Multiple } from "@common";

import { useAppSelector } from "@/store/hooks";
import {
	Ballot,
	BallotChange,
	BallotType,
	BallotTypeLabels,
	selectBallots,
} from "@/store/ballots";

import { BLANK_STR, MULTIPLE_STR } from "@/components/constants";

function nextBallotNumber(ballots: Ballot[], id: number, type: number) {
	let maxNumber = 0;
	for (const b of ballots) {
		if (b.id !== id && b.Type === type && b.number && b.number > maxNumber)
			maxNumber = b.number;
	}
	return maxNumber + 1;
}

export function BallotTypeRow({
	ballot,
	updateBallot,
	readOnly,
}: {
	ballot: Multiple<Ballot>;
	updateBallot: (changes: BallotChange) => void;
	readOnly?: boolean;
}) {
	const ballots = useAppSelector(selectBallots);

	function updateBallotType(type: number) {
		if (type !== ballot.Type) {
			updateBallot({
				Type: type,
				prev_id: null,
			});
			if (!isMultiple(ballot.id)) {
				const number = nextBallotNumber(ballots, ballot.id, type);
				updateBallot({ number });
			}
		}
	}

	const ballotNumberNA =
		ballot.Type !== BallotType.CC && ballot.Type !== BallotType.WG;

	return (
		<Row className="align-items-center mb-3">
			<Form.Label as="span" column>
				Ballot type/number:
			</Form.Label>
			<Col
				xs="auto"
				className="d-flex flex-wrap align-items-center justify-content-end"
			>
				{Object.values(BallotType).map((value) => (
					<Form.Check
						key={value}
						style={{ width: 120 }}
						label={BallotTypeLabels[value]}
						checked={ballot.Type === value}
						onChange={
							readOnly ? () => {} : () => updateBallotType(value)
						}
						ref={(ref) =>
							ref && (ref.indeterminate = isMultiple(ballot.Type))
						}
						//disabled={readOnly}
					/>
				))}
				<Form.Control
					style={{ lineHeight: "25px", width: "10ch" }}
					//size={10}
					type="number"
					name="number"
					value={
						isMultiple(ballot.number) ||
						ballotNumberNA ||
						ballot.number === null
							? ""
							: ballot.number
					}
					onChange={(e) =>
						updateBallot({ number: Number(e.target.value) })
					}
					placeholder={
						isMultiple(ballot.number)
							? MULTIPLE_STR
							: ballotNumberNA
							? "N/A"
							: BLANK_STR
					}
					readOnly={
						readOnly || isMultiple(ballot.number) || ballotNumberNA
					}
				/>
			</Col>
		</Row>
	);
}
