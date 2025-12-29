import { Button, Row, Col } from "react-bootstrap";
import type { Poll, PollAction } from "@/store/pollingAdmin";

export function PollActions({
	poll,
	onAction,
	onDelete,
}: {
	poll: Poll;
	onAction: (action: PollAction) => void;
	onDelete: () => void;
}) {
	const openDisabled =
		poll.state === null ||
		poll.state === "closed" ||
		(poll.type === "m" && (!poll.movedSAPIN || !poll.secondedSAPIN));

	const closeDisabled = poll.state !== "opened" && poll.state !== "closed";

	function openPoll() {
		onAction(poll.state === "opened" ? "show" : "open");
	}

	function closePoll() {
		onAction(poll.state === "closed" ? "open" : "close");
	}

	return (
		<Row className="mt-3">
			<Col className="d-flex gap-2">
				<Button
					variant="outline-success"
					active={poll.state === "opened" || poll.state === "closed"}
					onClick={openPoll}
					disabled={openDisabled}
				>
					<i className="bi-play me-1" />
					{poll.state === "opened" || poll.state === "closed"
						? "Restart"
						: "Start"}
				</Button>
				<Button
					variant="outline-warning"
					onClick={closePoll}
					active={poll.state === "closed"}
					disabled={closeDisabled}
				>
					<i className="bi-stop me-1" />
					{poll.state === "closed" ? "Closed" : "Stop"}
				</Button>
			</Col>
			<Col className="d-flex justify-content-end">
				<Button
					name="delete"
					variant="outline-danger"
					onClick={onDelete}
				>
					<i className="bi-trash me-1" />
					{"Delete"}
				</Button>
			</Col>
		</Row>
	);
}
