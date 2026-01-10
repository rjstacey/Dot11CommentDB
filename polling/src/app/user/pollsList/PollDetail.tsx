import { Poll } from "@/store/pollingUser";
import { PollState } from "../currentPoll/PollState";
import { PollTitleRow, PollBodyRow, PollMovedRow } from "@/components/poll";
import { PollOptionsRow } from "../currentPoll/PollOptionRow";

export function PollDetail({ poll }: { poll: Poll }) {
	return (
		<>
			<PollState state={poll.state} />
			<PollTitleRow poll={poll} />
			<PollBodyRow poll={poll} />
			<PollOptionsRow poll={poll} readOnly />
			<PollMovedRow poll={poll} />
		</>
	);
}
