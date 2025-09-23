import React from "react";
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

function useNextBallotNumber(id: number, type: number) {
	const ballots = useAppSelector(selectBallots);

	return React.useMemo(() => {
		if (type === BallotType.SA) return 0;
		let maxNumber = 0;
		for (const b of ballots) {
			if (
				b.id !== id &&
				b.Type === type &&
				b.number &&
				b.number > maxNumber
			)
				maxNumber = b.number;
		}
		return maxNumber + 1;
	}, [ballots, id, type]);
}

function BallotTypeNumberCol({
	ballot,
	original,
	type,
	updateBallot,
	readOnly,
}: {
	ballot: Multiple<Ballot>;
	original?: Multiple<Ballot>;
	type: number;
	updateBallot: (changes: BallotChange) => void;
	readOnly?: boolean;
}) {
	const id = isMultiple(ballot.id) ? 0 : ballot.id;
	const nextNumber = useNextBallotNumber(id, type);
	const defaultNumber =
		!isMultiple(ballot.Type) &&
		!isMultiple(ballot.number) &&
		ballot.Type === type
			? ballot.number
			: nextNumber;
	const [ballotNumber, setBallotNumber] = React.useState(defaultNumber);

	function updateBallotType(type: number) {
		if (type !== ballot.Type) {
			updateBallot({
				Type: type,
				prev_id: null,
				number: ballotNumber,
			});
			if (!isMultiple(ballot.id)) {
				updateBallot({ number: ballotNumber });
			}
		}
	}

	function updateBallotNumber(number: number) {
		setBallotNumber(number);
		updateBallot({ number });
	}

	const cn =
		original && original.number !== ballot.number ? "has-changes" : "";

	return (
		<Col
			xs="auto"
			className="d-flex flex-wrap align-items-center justify-content-end"
		>
			<Form.Check
				key={type}
				label={BallotTypeLabels[type]}
				checked={ballot.Type === type}
				onChange={readOnly ? () => {} : () => updateBallotType(type)}
				ref={(ref) =>
					ref && (ref.indeterminate = isMultiple(ballot.Type))
				}
				className="me-2"
			/>
			{type !== BallotType.SA && (
				<Form.Control
					className={cn}
					style={{
						width: "10ch",
						opacity: ballot.Type !== type ? 0.3 : undefined,
					}}
					//htmlSize={4}
					type="number"
					name="number"
					value={ballotNumber}
					onChange={(e) => updateBallotNumber(Number(e.target.value))}
					placeholder={
						isMultiple(ballot.Type) || isMultiple(ballot.number)
							? MULTIPLE_STR
							: BLANK_STR
					}
					readOnly={readOnly || isMultiple(ballot.number)}
					disabled={ballot.Type !== type}
				/>
			)}
		</Col>
	);
}

export function BallotTypeRow({
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
	const cn = original && original.Type !== ballot.Type ? "has-changes" : "";

	return (
		<Row className={"align-items-center mb-2"}>
			<Form.Label as="span" column>
				Ballot type/number:
			</Form.Label>
			<Col xs="auto">
				<Row className={"justify-content-end" + " " + cn}>
					{Object.values(BallotType).map((type) => (
						<BallotTypeNumberCol
							key={type}
							type={type}
							ballot={ballot}
							original={original}
							updateBallot={updateBallot}
							readOnly={readOnly}
						/>
					))}
				</Row>
			</Col>
		</Row>
	);
}
