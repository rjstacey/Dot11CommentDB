import type { Poll } from "@/store/pollingAdmin";
import { PollTypeSelect } from "./PollTypeSelect";
import { PollVotersSelect } from "./PollVotersSelect";
import { PollRecordSelect } from "./PollRecordSelect";
import { PollState } from "../pollSummary/PollState";

import css from "@/components/poll-layout.module.css";

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
					value={poll.votersType}
					onChange={(votersType) => changePoll({ votersType })}
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
				<PollState state={poll.state} />
			</div>
		</div>
	);
}
