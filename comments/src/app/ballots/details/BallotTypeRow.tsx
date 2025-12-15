import React from "react";
import { Row, Col, Form } from "react-bootstrap";
import { isMultiple } from "@common";

import { useAppSelector } from "@/store/hooks";
import {
	BallotCreate,
	BallotChange,
	BallotType,
	BallotTypeOptions,
	selectBallots,
} from "@/store/ballots";
import type { BallotMultiple } from "@/hooks/ballotsEdit";

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
	edited,
	saved,
	type,
	label,
	onChange,
	readOnly,
}: {
	edited: BallotCreate | BallotMultiple;
	saved?: BallotMultiple;
	type: BallotType;
	label: string;
	onChange: (changes: BallotChange) => void;
	readOnly?: boolean;
}) {
	const id = "id" in edited && !isMultiple(edited.id) ? edited.id : 0;
	const nextNumber = useNextBallotNumber(id, type);
	let defaultNumber = 0;
	if (!isMultiple(edited.Type) && !isMultiple(edited.number)) {
		defaultNumber = edited.Type === type ? edited.number : nextNumber;
	}
	const [ballotNumber, setBallotNumber] = React.useState(
		defaultNumber.toString()
	);

	React.useEffect(() => {
		if (saved === edited) setBallotNumber(defaultNumber.toString());
	}, [saved, edited]);

	function updateBallotType(type: number) {
		if (type !== edited.Type) {
			onChange({
				Type: type,
				prev_id: null,
				number: Number(ballotNumber),
			});
			if ("id" in edited && !isMultiple(edited.id)) {
				onChange({ number: Number(ballotNumber) });
			}
		}
	}

	function onChangeNumber(e: React.ChangeEvent<HTMLInputElement>) {
		setBallotNumber(e.target.value);
		const number = Number(e.target.value);
		onChange({ number });
	}

	const cn = saved && saved.number !== edited.number ? "has-changes" : "";

	return (
		<Col
			xs="auto"
			className="d-flex flex-wrap align-items-center justify-content-end"
		>
			<Form.Check
				key={type}
				label={label}
				checked={edited.Type === type}
				onChange={readOnly ? () => {} : () => updateBallotType(type)}
				ref={(ref) =>
					ref && (ref.indeterminate = isMultiple(edited.Type))
				}
				className="me-2"
			/>
			{type !== BallotType.SA && (
				<Form.Control
					className={cn}
					style={{
						width: "10ch",
						opacity: edited.Type !== type ? 0.3 : undefined,
					}}
					//htmlSize={4}
					type="number"
					name="number"
					value={ballotNumber}
					onChange={onChangeNumber}
					placeholder={
						isMultiple(edited.Type) || isMultiple(edited.number)
							? MULTIPLE_STR
							: BLANK_STR
					}
					readOnly={readOnly || isMultiple(edited.number)}
					disabled={edited.Type !== type}
				/>
			)}
		</Col>
	);
}

export function BallotTypeRow({
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
	const cn = saved && saved.Type !== edited.Type ? "has-changes" : "";

	return (
		<Row className={"align-items-center mb-2"}>
			<Form.Label as="span" column>
				Ballot type/number:
			</Form.Label>
			<Col xs="auto">
				<Row className={"justify-content-end" + " " + cn}>
					{BallotTypeOptions.map(({ value, label }) => (
						<BallotTypeNumberCol
							key={value}
							type={value}
							label={label}
							edited={edited}
							saved={saved}
							onChange={onChange}
							readOnly={readOnly}
						/>
					))}
				</Row>
			</Col>
		</Row>
	);
}
