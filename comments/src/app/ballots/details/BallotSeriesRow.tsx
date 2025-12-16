import React from "react";
import { Row, Col, Form } from "react-bootstrap";
import { isMultiple } from "@common";

import {
	getBallotId,
	type BallotCreate,
	type BallotChange,
} from "@/store/ballots";
import { useGetBallotSeries, type BallotMultiple } from "@/hooks/ballotsEdit";

export function BallotSeriesRow({
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
	const getBallotSeries = useGetBallotSeries();
	let ballotSeriesStr: React.ReactNode;
	let isLast = false;
	if ("id" in edited && !isMultiple(edited.id)) {
		const ballotSeries = getBallotSeries(edited.id);
		isLast = edited.id === ballotSeries[ballotSeries.length - 1]?.id;
		ballotSeriesStr = ballotSeries.map((b, i) => (
			<span
				key={b.id}
				style={{
					marginRight: 20,
					fontWeight: edited.id === b.id ? "bold" : "normal",
				}}
			>
				{getBallotId({ ...b, stage: i })}
			</span>
		));
	}

	const cn =
		saved && saved.IsComplete !== edited.IsComplete ? "has-changes" : "";

	function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
		if (readOnly) return;
		onChange({
			IsComplete: e.target.checked,
		});
	}

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
					className={cn + " me-2"}
					label="Final in series"
					checked={Boolean(edited.IsComplete)}
					onChange={handleChange}
					ref={(ref) =>
						ref &&
						(ref.indeterminate = isMultiple(edited.IsComplete))
					}
					disabled={!isLast}
				/>
			</Col>
		</Form.Group>
	);
}
