import { Row, Col, Form } from "react-bootstrap";
import { isMultiple, Multiple } from "@common";

import { useAppSelector } from "@/store/hooks";
import {
	Ballot,
	BallotChange,
	getBallotId,
	selectBallotIds,
	selectBallotEntities,
} from "@/store/ballots";
import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "@/store";

const selectBallotSeries = createSelector(
	selectBallotIds,
	selectBallotEntities,
	(state: RootState, ballot: Multiple<Ballot>) => ballot,
	(ids, entities, ballotIn) => {
		const ballotSeries: Ballot[] = [];
		if (!isMultiple(ballotIn.id)) {
			let ballot: Ballot | undefined = ballotIn as Ballot;
			ballotSeries.unshift(ballot);
			while (ballot?.prev_id) {
				ballot = entities[ballot.prev_id];
				if (ballot) ballotSeries.unshift(ballot);
			}
			ballot = ballotIn as Ballot;
			for (const id of ids) {
				const b = entities[id]!;
				if (b.prev_id === ballot.id) {
					ballot = b;
					ballotSeries.push(ballot);
				}
			}
		}
		return ballotSeries;
	}
);

export function BallotSeriesRow({
	ballot,
	updateBallot,
	readOnly,
}: {
	ballot: Multiple<Ballot>;
	updateBallot: (changes: BallotChange) => void;
	readOnly?: boolean;
}) {
	const ballotSeries = useAppSelector((state) =>
		selectBallotSeries(state, ballot)
	);
	const isLast = ballot.id === ballotSeries[ballotSeries.length - 1]?.id;

	const ballotSeriesStr = ballotSeries.map((b, i) => (
		<span
			key={b.id}
			style={{
				marginRight: 20,
				fontWeight: ballot.id === b.id ? "bold" : "normal",
			}}
		>
			{getBallotId({ ...b, stage: i })}
		</span>
	));

	return (
		<Form.Group as={Row} className="mb-2" readOnly={readOnly}>
			<Form.Label as="span" column>
				Ballot series:
			</Form.Label>
			<Col
				xs="auto"
				className="d-flex justify-content-end align-items-center"
			>
				<div>{ballotSeriesStr}</div>
				<Form.Check
					className="me-2"
					label="Final in series"
					checked={Boolean(ballot.IsComplete)}
					onChange={
						readOnly
							? () => {}
							: (e) =>
									updateBallot({
										IsComplete: e.target.checked,
									})
					}
					ref={(ref) =>
						ref &&
						(ref.indeterminate = isMultiple(ballot.IsComplete))
					}
					disabled={!isLast}
				/>
			</Col>
		</Form.Group>
	);
}
