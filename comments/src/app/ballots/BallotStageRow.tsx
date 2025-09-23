import { Row, Col, Form } from "react-bootstrap";
import { isMultiple, Multiple } from "@common";

import { useAppSelector } from "@/store/hooks";
import {
	Ballot,
	BallotChange,
	BallotType,
	selectBallotIds,
	selectBallotEntities,
} from "@/store/ballots";
import { DateTime } from "luxon";
import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "@/store";

const selectPrevBallot = createSelector(
	selectBallotIds,
	selectBallotEntities,
	(state: RootState, ballot: Multiple<Ballot>) => ballot,
	(ids, entities, ballot) => {
		if (isMultiple(ballot.id)) return;
		const prevBallots: Ballot[] = ids
			.map((id) => entities[id]!)
			.filter(
				(b) =>
					b.Type === ballot.Type &&
					b.groupId === ballot.groupId &&
					b.Project === ballot.Project &&
					DateTime.fromISO(b.Start!) <
						DateTime.fromISO(ballot.Start!) &&
					b.id !== ballot.id
			)
			.sort(
				(b1, b2) =>
					DateTime.fromISO(b1.Start!).valueOf() -
					DateTime.fromISO(b2.Start!).valueOf()
			);
		if (prevBallots.length > 0) return prevBallots[prevBallots.length - 1];
	}
);

export function BallotStageRow({
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
	const prevBallot = useAppSelector((state: RootState) =>
		selectPrevBallot(state, ballot)
	);

	if (ballot.Type !== BallotType.WG && ballot.Type !== BallotType.SA)
		return null;
	const cn =
		original && original.prev_id !== ballot.prev_id ? "has-changes" : "";

	return (
		<Row className="mb-2">
			<Form.Label as="span" column>
				Ballot stage:
			</Form.Label>
			<Col xs="auto" className="d-flex flex-wrap align-items-center">
				<Form.Check
					className={cn + " me-4"}
					label="Initial"
					checked={!ballot.prev_id}
					onChange={
						readOnly
							? () => {}
							: (e) =>
									updateBallot(
										e.target.checked
											? {
													prev_id: null,
											  }
											: {
													prev_id: prevBallot
														? prevBallot.id
														: null,
											  }
									)
					}
					ref={(ref) =>
						ref && (ref.indeterminate = isMultiple(ballot.prev_id))
					}
				/>
				<Form.Check
					className={cn + " me-2"}
					label="Recirculation"
					checked={Boolean(ballot.prev_id)}
					onChange={
						readOnly
							? () => {}
							: (e) =>
									updateBallot(
										e.target.checked
											? {
													prev_id: prevBallot
														? prevBallot.id
														: null,
											  }
											: {
													prev_id: null,
											  }
									)
					}
					ref={(ref) =>
						ref && (ref.indeterminate = isMultiple(ballot.prev_id))
					}
					disabled={!prevBallot}
				/>
			</Col>
		</Row>
	);
}
