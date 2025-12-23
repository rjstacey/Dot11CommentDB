import { Button, Row, Col } from "react-bootstrap";
import { useAppDispatch } from "@/store/hooks";
import {
	type Poll,
	pollingAdminPollAction,
	pollingAdminDeletePoll,
} from "@/store/pollingAdmin";

export function PollActions({ poll }: { poll: Poll }) {
	const dispatch = useAppDispatch();

	const openDisabled =
		poll.state === null ||
		poll.state === "closed" ||
		(poll.type === "m" && (!poll.movedSAPIN || !poll.secondedSAPIN));

	const closeDisabled = poll.state === null || poll.state === "shown";

	function openPoll() {
		dispatch(
			pollingAdminPollAction(
				poll.id,
				poll.state === "opened" ? "show" : "open"
			)
		);
	}

	function closePoll() {
		dispatch(
			pollingAdminPollAction(
				poll.id,
				poll.state === "closed" ? "open" : "close"
			)
		);
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
					{"Start"}
				</Button>
				<Button
					variant="outline-warning"
					onClick={closePoll}
					disabled={closeDisabled}
				>
					<i className="bi-stop me-1" />
					{"Stop"}
				</Button>
			</Col>
			<Col className="d-flex justify-content-end">
				<Button
					name="delete"
					variant="outline-danger"
					onClick={() => dispatch(pollingAdminDeletePoll(poll.id))}
				>
					<i className="bi-trash me-1" />
					{"Delete"}
				</Button>
			</Col>
		</Row>
	);
}
