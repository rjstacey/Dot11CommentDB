import { useAppSelector } from "@/store/hooks";
import type { Poll } from "@/store/pollingAdmin";
import { selectPollingAdminVoted } from "@/store/pollingAdmin";

import { PollTypeSelect } from "./PollTypeSelect";
import { PollVotersSelect } from "./PollVotersSelect";
import { PollRecordSelect } from "./PollRecordSelect";
import { PollState } from "./PollState";

import css from "@/components/poll-layout.module.css";

export function VotersCount() {
	const voted = useAppSelector(selectPollingAdminVoted);

	return (
		<div className="d-flex gap-2">
			<span className="bi-people">{voted.numMembers}</span>
			<span className="bi-hand-index">{voted.numVoters}</span>
		</div>
	);
}

export function PollTypeStatusRow({
	poll,
	changePoll,
	disabled,
}: {
	poll: Poll;
	changePoll: (changes: Partial<Poll>) => void;
	readOnly?: boolean;
	disabled?: boolean;
}) {
	return (
		<div className={css["poll-action-row"]}>
			<div className={css["poll-action-group"]}>
				<PollTypeSelect
					value={poll.type}
					onChange={(type) => changePoll({ type })}
					disabled={disabled}
				/>
				<PollVotersSelect
					poll={poll}
					changePoll={changePoll}
					disabled={disabled}
				/>
				<PollRecordSelect
					value={poll.recordType}
					onChange={(recordType) => changePoll({ recordType })}
					disabled={disabled}
				/>
			</div>
			<div className={css["poll-action-group"]}>
				<span>This poll is:</span>
				<PollState poll={poll} />
			</div>
		</div>
	);
}
