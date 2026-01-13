import { Form } from "react-bootstrap";
import cx from "clsx";
import { useAppSelector } from "@/store/hooks";
import {
	Poll,
	PollVotersType,
	selectPollingAdminVoted,
} from "@/store/pollingAdmin";
import React from "react";

export function PollVotersSelect({
	poll,
	changePoll,
	disabled,
	readOnly,
	className,
}: {
	poll: Poll;
	changePoll: (changes: Partial<Poll>) => void;
	disabled?: boolean;
	readOnly?: boolean;
	className?: string;
}) {
	const { pollId, numVoters } = useAppSelector(selectPollingAdminVoted);
	let countElement: React.ReactNode = null;
	if (poll.id === pollId) {
		countElement = <span>{numVoters}</span>;
	}

	const onChange = (value: PollVotersType) =>
		changePoll({ votersType: value });

	return (
		<div
			className={cx(
				"d-flex align-items-center gap-2",
				readOnly && "pe-none",
				className
			)}
		>
			<div className="d-flex flex-column align-items-center">
				<span>Voters:</span>
				{countElement}
			</div>
			<Form.Group>
				<Form.Check
					type="radio"
					id="poll-voters-type-anyone"
					checked={poll.votersType === PollVotersType.ANYONE}
					onChange={() => onChange(PollVotersType.ANYONE)}
					disabled={disabled}
					label="Anyone"
				/>
				<Form.Check
					type="radio"
					id="poll-voters-type-voter"
					checked={poll.votersType === PollVotersType.VOTER}
					onChange={() => onChange(PollVotersType.VOTER)}
					disabled={disabled}
					label="Voters"
				/>
				<Form.Check
					type="radio"
					id="poll-voters-type-voter-potential-voter"
					checked={
						poll.votersType === PollVotersType.VOTER_POTENTIAL_VOTER
					}
					onChange={() =>
						onChange(PollVotersType.VOTER_POTENTIAL_VOTER)
					}
					disabled={disabled}
					label="Voters & Potential Voters"
				/>
			</Form.Group>
		</div>
	);
}
