import { Row, Col, Form } from "react-bootstrap";
import { isMultiple } from "@common";

import type { BallotMultiple } from "@/hooks/ballotsEdit";
import {
	type BallotCreate,
	type BallotChange,
	BallotType,
} from "@/store/ballots";
import { BLANK_STR, MULTIPLE_STR } from "@/components/constants";

export function BallotEpollRow({
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
	if (edited.Type === BallotType.SA) return null;
	const isMultipleBallots = saved && isMultiple(saved.id);
	const hasChanges = saved && saved.EpollNum !== saved.EpollNum;
	const cn = hasChanges ? "has-changes" : undefined;
	return (
		<Form.Group
			as={Row}
			controlId="ballot-epoll-number"
			className="align-items-center mb-2"
		>
			<Form.Label column>ePoll number:</Form.Label>
			<Col xs="auto">
				<Form.Control
					className={cn}
					type="search"
					name="EpollNum"
					value={
						isMultiple(edited.EpollNum) || edited.EpollNum === null
							? ""
							: edited.EpollNum
					}
					onChange={(e) =>
						onChange({
							EpollNum: e.target.value
								? Number(e.target.value)
								: null,
						})
					}
					placeholder={
						isMultiple(edited.EpollNum) ? MULTIPLE_STR : BLANK_STR
					}
					readOnly={readOnly || isMultipleBallots}
				/>
				{hasChanges && (
					<Form.Text>
						{isMultiple(saved.EpollNum)
							? MULTIPLE_STR
							: saved.EpollNum}
					</Form.Text>
				)}
			</Col>
		</Form.Group>
	);
}
