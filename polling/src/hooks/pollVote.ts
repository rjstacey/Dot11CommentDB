import React from "react";
import isEqual from "lodash.isequal";
import { useAppDispatch } from "@/store/hooks";
import {
	Poll,
	pollingUserSubmitVote,
	PollChoice,
	PollResult,
} from "@/store/pollingUser";

export function usePollVote(
	poll: Poll,
	pollVotes: PollResult | null,
	readOnly?: boolean
) {
	const dispatch = useAppDispatch();
	const [busy, setBusy] = React.useState(false);
	const [votes, setVotes] = React.useState<number[]>([]);
	const successful = pollVotes && isEqual(pollVotes.votes, votes);

	React.useEffect(() => {
		setVotes(pollVotes?.votes || []);
	}, [pollVotes, poll]);

	const toggleVote = React.useCallback(
		(index: number) => {
			if (readOnly) {
				console.warn("toggleVote while readOnly");
				return;
			}
			let newVotes = votes.slice();
			if (poll.choice === PollChoice.MULTIPLE) {
				const i = newVotes.indexOf(index);
				if (i >= 0) newVotes.splice(i, 1);
				else newVotes.push(index);
			} else {
				newVotes = [index];
			}
			setVotes(newVotes);
		},
		[votes, poll.choice, readOnly]
	);

	const submitVote = React.useCallback(async () => {
		if (readOnly) {
			console.warn("submitVote while readOnly");
			return;
		}
		setBusy(true);
		await dispatch(pollingUserSubmitVote(poll.id, votes));
		setBusy(false);
	}, [dispatch, poll.id, votes, readOnly]);

	return {
		busy,
		successful,
		votes,
		toggleVote,
		submitVote,
	};
}
