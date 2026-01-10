import { useAppSelector } from "@/store/hooks";
import {
	Poll,
	PollVotersType,
	selectPollingUserStatus,
} from "@/store/pollingUser";
import css from "@/components/poll-layout.module.css";

export function PollMemberStatus({ poll }: { poll: Poll }) {
	const status = useAppSelector(selectPollingUserStatus);
	let votersStr = "";
	if (poll.votersType === PollVotersType.ANYONE)
		votersStr = "Anyone can vote";
	else if (poll.votersType === PollVotersType.VOTER) {
		votersStr = 'Members with "Voter" status can vote.';
		if (status === "Voter" || status === "ExOfficio")
			votersStr += " You can vote.";
	} else if (poll.votersType === PollVotersType.VOTER_POTENTIAL_VOTER) {
		votersStr =
			'Members with "Voter" or "Potential Voter" status can vote.';
		if (
			status === "Voter" ||
			status === "ExOfficio" ||
			status === "Potential Voter"
		)
			votersStr += " You can vote.";
	}
	return (
		<div className={css["poll-title-row"]}>
			<span>Your status: {status}</span>
			<br />
			<span>{votersStr}</span>
		</div>
	);
}
