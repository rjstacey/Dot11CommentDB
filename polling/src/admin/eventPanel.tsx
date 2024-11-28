import { Button } from "dot11-components";
import { Event, Poll } from "../schemas/poll";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
	selectPollingAdminPolls,
	selectPollAdminEvent,
	pollingAdminEventPublish,
} from "../store/pollingAdmin";
import css from "./admin.module.css";
import CreatePollDropdown from "./createPoll";

function EventActions({ event }: { event: Event }) {
	const dispatch = useAppDispatch();

	function toggleIsPublished() {
		dispatch(pollingAdminEventPublish(event.id, !event.isPublished));
	}

	return (
		<div className={css.eventActions}>
			<Button isActive={event.isPublished} onClick={toggleIsPublished}>
				Publish
			</Button>
			<CreatePollDropdown />
		</div>
	);
}

function PollEntry({ poll }: { poll: Poll }) {
	return (
		<div className={css.pollEntry}>
			<span>{poll.title}</span>
			<span>{poll.body}</span>
		</div>
	);
}

function EventPanel() {
	const event = useAppSelector(selectPollAdminEvent);
	const polls = useAppSelector(selectPollingAdminPolls);

	if (!event) return null;

	return (
		<>
			<EventActions event={event} />
			<div className={css.pollTable}>
				{polls.map((poll) => (
					<PollEntry poll={poll} />
				))}
			</div>
		</>
	);
}

export default EventPanel;
