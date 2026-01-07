import { Button } from "react-bootstrap";
import { useAppSelector } from "@/store/hooks";
import type { Poll, PollAction } from "@/store/pollingAdmin";
import { selectPollingAdminVoted } from "@/store/pollingAdmin";

import css from "@/components/poll-layout.module.css";

function PollReturns({ poll }: { poll: Poll }) {
	const { pollId, numVotes, numVoters } = useAppSelector(
		selectPollingAdminVoted
	);
	if (
		pollId !== poll.id ||
		(poll.state !== "opened" && poll.state !== "closed")
	) {
		return null;
	}
	return (
		<span>
			<i className="bi-check-all me-1" />
			{`${numVotes} / ${numVoters}`}
		</span>
	);
}

export function PollActions({
	poll,
	onAction,
	onDelete,
}: {
	poll: Poll;
	onAction: (action: PollAction) => void;
	onDelete: () => void;
}) {
	const showDisabled = poll.state !== null && poll.state !== "shown";
	function showPoll() {
		if (poll.state === null) onAction("show");
		else if (poll.state === "shown") onAction("unshow");
	}

	const openDisabled =
		poll.state === null ||
		(poll.type === "m" && (!poll.movedSAPIN || !poll.secondedSAPIN));
	function openPoll() {
		if (poll.state === "shown") onAction("open");
	}

	const closeDisabled = poll.state !== "opened" && poll.state !== "closed";
	function closePoll() {
		if (poll.state === "opened") onAction("close");
	}

	function resetPoll() {
		onAction("show");
	}

	return (
		<div className={css["poll-action-row"]}>
			<div className={css["poll-action-group"]}>
				<Button
					variant="outline-primary"
					active={Boolean(poll.state)}
					onClick={showPoll}
					className={showDisabled ? "pe-none" : undefined}
				>
					<i className="bi-eye me-1" />
					{"Show"}
				</Button>
				<Button
					variant="outline-success"
					active={poll.state === "opened" || poll.state === "closed"}
					onClick={openPoll}
					disabled={openDisabled}
					className={poll.state !== "shown" ? "pe-none" : undefined}
				>
					<i className="bi-play me-1" />
					{"Start"}
				</Button>
				<Button
					variant="outline-warning"
					onClick={closePoll}
					active={poll.state === "closed"}
					disabled={closeDisabled}
					className={poll.state !== "opened" ? "pe-none" : undefined}
				>
					<i className="bi-stop me-1" />
					{"Close"}
				</Button>
				<PollReturns poll={poll} />
			</div>
			<div className={css["poll-action-group"]}>
				<Button
					name="reset"
					variant="outline-warning"
					onClick={resetPoll}
					disabled={poll.state === null}
				>
					<i className="bi-rewind me-1" />
					{"Reset"}
				</Button>
				<Button
					name="delete"
					variant="outline-danger"
					onClick={onDelete}
				>
					<i className="bi-trash me-1" />
					{"Delete"}
				</Button>
			</div>
		</div>
	);
}
