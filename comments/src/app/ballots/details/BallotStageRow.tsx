import React from "react";
import { Row, Col, Form } from "react-bootstrap";
import { isMultiple } from "@common";

import { useAppSelector } from "@/store/hooks";
import {
	Ballot,
	BallotCreate,
	BallotChange,
	BallotType,
	selectBallotIds,
	selectBallotEntities,
} from "@/store/ballots";
import type { BallotMultiple } from "@/hooks/ballotsEdit";

function useGetPrevBallot() {
	const ids = useAppSelector(selectBallotIds);
	const entities = useAppSelector(selectBallotEntities);

	return React.useCallback(
		({
			id,
			groupId,
			Type,
			Project,
			Start,
		}: {
			id?: number;
			groupId: string;
			Type: BallotType;
			Project: string;
			Start: string | null;
		}) => {
			const prevBallots: Ballot[] = ids
				.map((id) => entities[id]!)
				.filter(
					(b) =>
						b.groupId === groupId &&
						b.Type === Type &&
						b.Project === Project &&
						new Date(b.Start!).getTime() <
							new Date(Start!).getTime() &&
						b.id !== id
				)
				.sort(
					(b1, b2) =>
						new Date(b1.Start!).getTime() -
						new Date(b2.Start!).getTime()
				);
			if (prevBallots.length > 0)
				return prevBallots[prevBallots.length - 1];
		},
		[ids, entities]
	);
}

export function BallotStageRow({
	edited,
	saved,
	onChange,
	readOnly,
}: {
	edited: BallotCreate | BallotMultiple;
	saved?: BallotMultiple;
	onChange: (changes: BallotChange) => void;
	readOnly?: boolean;
}) {
	const getPrevBallot = useGetPrevBallot();
	if (edited.Type !== BallotType.WG && edited.Type !== BallotType.SA)
		return null;

	let prevBallot: Ballot | undefined;
	if ("id" in edited) {
		if (!isMultiple("id")) prevBallot = getPrevBallot(edited as Ballot);
	} else {
		prevBallot = getPrevBallot(edited as BallotCreate);
	}

	const cn = saved && saved.prev_id !== edited.prev_id ? "has-changes" : "";

	return (
		<Row className="mb-2">
			<Form.Label as="span" column>
				Ballot stage:
			</Form.Label>
			<Col xs="auto" className="d-flex flex-wrap align-items-center">
				<Form.Check
					className={cn + " me-4"}
					label="Initial"
					checked={!edited.prev_id}
					onChange={
						readOnly
							? () => {}
							: (e) =>
									onChange(
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
						ref && (ref.indeterminate = isMultiple(edited.prev_id))
					}
				/>
				<Form.Check
					className={cn + " me-2"}
					label="Recirculation"
					checked={Boolean(edited.prev_id)}
					onChange={
						readOnly
							? () => {}
							: (e) =>
									onChange(
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
						ref && (ref.indeterminate = isMultiple(edited.prev_id))
					}
					disabled={!prevBallot}
				/>
			</Col>
		</Row>
	);
}
