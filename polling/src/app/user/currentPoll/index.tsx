import { useAppSelector } from "@/store/hooks";
import { selectPollingUserActivePoll } from "@/store/pollingUser";
import { PollTitleRow, PollBodyRow, PollMovedRow } from "@/components/poll";
import { PollState } from "./PollState";
import { PollMemberStatus } from "./PollMemberStatus";
import { PollOptionsRow } from "./PollOptionRow";

export function CurrentPoll() {
	const poll = useAppSelector(selectPollingUserActivePoll);

	if (!poll) return null;

	return (
		<>
			<PollMemberStatus poll={poll} />
			<PollState state={poll.state} />
			<PollTitleRow poll={poll} />
			<PollBodyRow poll={poll} />
			<PollOptionsRow poll={poll} />
			<PollMovedRow poll={poll} />
		</>
	);
}
