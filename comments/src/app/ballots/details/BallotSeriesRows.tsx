import React from "react";
import { Row, Col, Form } from "react-bootstrap";
import { isMultiple } from "@common";

import {
	getBallotId,
	BallotType,
	type Ballot,
	type BallotCreate,
	type BallotChange,
} from "@/store/ballots";
import { useGetBallotSeries, type BallotMultiple } from "@/hooks/ballotsEdit";

export function BallotSeriesRows({
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
	const { getPrevBallots, getPotentialPrevBallots, getFutureBallots } =
		useGetBallotSeries();

	if (edited.Type !== BallotType.WG && edited.Type !== BallotType.SA)
		return null;

	function ballotSeriesNode(
		b: Ballot,
		i: number,
		style?: React.CSSProperties
	) {
		return (
			<span
				key={i}
				style={{
					marginRight: 20,
					...style,
				}}
			>
				{getBallotId({ ...b, stage: i })}
			</span>
		);
	}
	let ballotSeriesNodes: JSX.Element[] = [];

	let prevBallots: Ballot[] = [];
	if (edited.prev_id && !isMultiple(edited.prev_id)) {
		prevBallots = getPrevBallots(edited.prev_id);
		ballotSeriesNodes = prevBallots.map((b, i) => ballotSeriesNode(b, i));
	} else {
		const id =
			"id" in edited && !isMultiple(edited.id) ? edited.id : undefined;
		const { groupId, Type, Project, Start } = edited;
		if (
			!isMultiple(groupId) &&
			!isMultiple(Type) &&
			!isMultiple(Project) &&
			!isMultiple(Start)
		) {
			prevBallots = getPotentialPrevBallots({
				id,
				groupId,
				Type,
				Project,
				Start,
			});
			ballotSeriesNodes = prevBallots.map((b, i) =>
				ballotSeriesNode(b, i, { fontStyle: "italic" })
			);
			ballotSeriesNodes.unshift(
				<span style={{ fontStyle: "italic" }}>{"(possible: "}</span>
			);
			ballotSeriesNodes.push(
				<span
					style={{
						fontStyle: "italic",
						marginLeft: -20,
						marginRight: 20,
					}}
				>
					{")"}
				</span>
			);
		}
	}
	const prevBallot =
		prevBallots.length > 0
			? prevBallots[prevBallots.length - 1]
			: undefined;

	let futureBallots: Ballot[] = [];
	if ("id" in edited && !isMultiple(edited.id)) {
		futureBallots = getFutureBallots(edited.id);
	}
	const isLast = futureBallots.length === 0;

	ballotSeriesNodes = ballotSeriesNodes
		.concat(
			ballotSeriesNode(edited as Ballot, ballotSeriesNodes.length, {
				fontWeight: "bold",
			})
		)
		.concat(
			futureBallots.map((b, i) =>
				ballotSeriesNode(b, i + ballotSeriesNodes.length + 1)
			)
		);

	function togglePrevId() {
		if (readOnly) return;
		if (edited.prev_id) {
			onChange({ prev_id: null });
		} else if (prevBallot) {
			onChange({ prev_id: prevBallot.id });
		}
	}

	function onChangeIsComplete(e: React.ChangeEvent<HTMLInputElement>) {
		if (readOnly) return;
		onChange({
			IsComplete: e.target.checked,
		});
	}

	const cn1 = saved && saved.prev_id !== edited.prev_id ? "has-changes" : "";
	const cn2 =
		saved && saved.IsComplete !== edited.IsComplete ? "has-changes" : "";

	return (
		<>
			<Form.Group as={Row} className="mb-2">
				<Form.Label as="span" column>
					Ballot stage:
				</Form.Label>
				<Col xs="auto" className="d-flex flex-wrap align-items-center">
					<Form.Check
						className={cn1 + " me-4"}
						label="Initial"
						checked={!edited.prev_id}
						onChange={togglePrevId}
						ref={(ref) =>
							ref &&
							(ref.indeterminate = isMultiple(edited.prev_id))
						}
					/>
					<Form.Check
						className={cn1 + " me-2"}
						label="Recirculation"
						checked={Boolean(edited.prev_id)}
						onChange={togglePrevId}
						ref={(ref) =>
							ref &&
							(ref.indeterminate = isMultiple(edited.prev_id))
						}
						disabled={!prevBallot}
					/>
				</Col>
			</Form.Group>
			<Form.Group as={Row} className="mb-2" readOnly={readOnly}>
				<Form.Label as="span" column>
					Ballot series:
				</Form.Label>
				<Col
					xs="auto"
					className="d-flex justify-content-end align-items-center"
				>
					<div>{ballotSeriesNodes}</div>
					<Form.Check
						className={cn2 + " me-2"}
						label="Final in series"
						checked={Boolean(edited.IsComplete)}
						onChange={onChangeIsComplete}
						ref={(ref) =>
							ref &&
							(ref.indeterminate = isMultiple(edited.IsComplete))
						}
						disabled={!isLast}
					/>
				</Col>
			</Form.Group>
		</>
	);
}
