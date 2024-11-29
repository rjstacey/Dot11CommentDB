import { Button } from "dot11-components";
import { Event, Poll } from "../schemas/poll";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
	selectPollingAdminPolls,
	selectPollAdminEvent,
	pollingAdminEventPublish,
	pollingAdminSelectPoll,
	selectPollingAdminPollId,
} from "../store/pollingAdmin";
import css from "./admin.module.css";
import editorCss from "../editor/editor.module.css";
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
	const dispatch = useAppDispatch();
	const isSelected = useAppSelector(selectPollingAdminPollId) === poll.id;
	let cn = css.pollEntry;
	if (isSelected) cn += " selected";
	return (
		<div className={css.pollRow}>
			<div className={cn}>
				<span>{poll.title}</span>
				<div
					className={editorCss.bodyContainer}
					dangerouslySetInnerHTML={{ __html: poll.body }}
				/>
			</div>
			<Button onClick={() => dispatch(pollingAdminSelectPoll(poll.id))}>
				Select
			</Button>
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
					<PollEntry key={poll.id} poll={poll} />
				))}
			</div>
		</>
	);
}

export default EventPanel;
