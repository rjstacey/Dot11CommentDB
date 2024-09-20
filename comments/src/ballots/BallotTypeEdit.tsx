import React from "react";
import {
	Row,
	Field,
	Checkbox,
	Input,
	isMultiple,
	Multiple,
} from "dot11-components";

import { useAppSelector } from "../store/hooks";
import {
	Ballot,
	BallotEdit,
	getBallotId,
	BallotType,
	BallotTypeLabels,
	selectBallotIds,
	selectBallotEntities,
	selectBallots,
} from "../store/ballots";
import { DateTime } from "luxon";
import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "../store";

const BLANK_STR = "(Blank)";
const MULTIPLE_STR = "(Multiple)";

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
			for (let id of ids) {
				let b = entities[id]!;
				if (b.prev_id === ballot.id) {
					ballot = b;
					ballotSeries.push(ballot);
				}
			}
		}
		return ballotSeries;
	}
);

function nextBallotNumber(ballots: Ballot[], id: number, type: number) {
	let maxNumber = 0;
	for (const b of ballots) {
		if (b.id !== id && b.Type === type && b.number && b.number > maxNumber)
			maxNumber = b.number;
	}
	return maxNumber + 1;
}

function LabeledCheckbox({
	label,
	value,
	onChange,
	indeterminate,
	disabled,
	style,
	className,
}: {
	label: string;
	value: boolean;
	onChange: (value: boolean) => void;
	indeterminate?: boolean;
	disabled?: boolean;
	style?: React.CSSProperties;
	className?: string;
}) {
	return (
		<div
			className={className}
			style={{
				...style,
				display: "flex",
				alignContent: "center",
			}}
		>
			<Checkbox
				id={label}
				checked={value}
				indeterminate={indeterminate}
				onChange={(e) => onChange(e.target.checked)}
				disabled={disabled}
			/>
			<label htmlFor={label} style={{ opacity: disabled ? 0.5 : 1 }}>
				{label}
			</label>
		</div>
	);
}

function BallotSeries({
	ballot,
	updateBallot,
	readOnly,
}: {
	ballot: Multiple<Ballot>;
	updateBallot: (changes: Partial<BallotEdit>) => void;
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
		<Row>
			<Field label="Ballot series:">
				<div style={{ display: "flex", flexWrap: "wrap" }}>
					{ballotSeriesStr}
					<LabeledCheckbox
						label="Final in series"
						value={Boolean(ballot.IsComplete)}
						onChange={(checked) =>
							updateBallot({
								IsComplete: checked,
							})
						}
						indeterminate={isMultiple(ballot.IsComplete)}
						disabled={readOnly || !isLast}
					/>
				</div>
			</Field>
		</Row>
	);
}

function BallotStage({
	ballot,
	updateBallot,
	readOnly,
}: {
	ballot: Multiple<Ballot>;
	updateBallot: (changes: Partial<BallotEdit>) => void;
	readOnly?: boolean;
}) {
	const prevBallot = useAppSelector((state) =>
		selectPrevBallot(state, ballot)
	);

	if (ballot.Type !== BallotType.WG && ballot.Type !== BallotType.SA)
		return null;
	return (
		<>
			<Row>
				<Field label="Ballot stage:">
					<div
						style={{
							display: "flex",
							flexWrap: "wrap",
						}}
					>
						<LabeledCheckbox
							style={{ width: 120 }}
							label="Initial"
							value={!ballot.prev_id}
							onChange={(checked) =>
								updateBallot(
									checked
										? {
												prev_id: null,
												//IsRecirc: false,
										  }
										: {
												prev_id: prevBallot!.id,
												//IsRecirc: true,
										  }
								)
							}
							indeterminate={isMultiple(ballot.prev_id)}
							disabled={readOnly}
						/>
						<LabeledCheckbox
							style={{ width: 120 }}
							label="Recirc"
							value={Boolean(ballot.prev_id)}
							onChange={(checked) =>
								updateBallot(
									checked
										? {
												prev_id: prevBallot!.id,
												//IsRecirc: true,
										  }
										: {
												prev_id: null,
												//IsRecirc: false,
										  }
								)
							}
							indeterminate={isMultiple(ballot.prev_id)}
							disabled={readOnly || !prevBallot}
						/>
					</div>
				</Field>
			</Row>
			<BallotSeries
				ballot={ballot}
				updateBallot={updateBallot}
				readOnly={readOnly}
			/>
		</>
	);
}

export function BallotTypeSelect({
	ballot,
	updateBallot,
	readOnly,
}: {
	ballot: Multiple<Ballot>;
	updateBallot: (changes: Partial<BallotEdit>) => void;
	readOnly?: boolean;
}) {
	const ballots = useAppSelector(selectBallots);

	function updateBallotType(type: number) {
		if (type !== ballot.Type) {
			updateBallot({
				Type: type,
				//IsRecirc: false,
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
		<>
			<Row>
				<Field label="Ballot type/number:">
					<div
						style={{
							display: "flex",
							flexWrap: "wrap",
						}}
					>
						{Object.values(BallotType).map((value) => (
							<LabeledCheckbox
								key={value}
								style={{ width: 120 }}
								label={BallotTypeLabels[value]}
								value={ballot.Type === value}
								onChange={() => updateBallotType(value)}
								indeterminate={isMultiple(ballot.Type)}
								disabled={readOnly}
							/>
						))}
						<Input
							style={{ lineHeight: "25px", width: "10ch" }}
							size={10}
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
							disabled={
								readOnly ||
								isMultiple(ballot.number) ||
								ballotNumberNA
							}
						/>
					</div>
				</Field>
			</Row>
			<BallotStage
				ballot={ballot}
				updateBallot={updateBallot}
				readOnly={readOnly}
			/>
		</>
	);
}

export default BallotTypeSelect;
