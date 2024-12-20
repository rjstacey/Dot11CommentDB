import { Button } from "dot11-components";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
	selectPollingAdminPolls,
	selectPollAdminEvent,
	selectPollingAdminSelectedPollId,
	pollingAdminEventPublish,
	pollingAdminAddPoll,
	Event,
	Poll,
	setSelectedPollId,
	pollingAdminDeletePoll,
} from "../store/pollingAdmin";
import css from "./admin.module.css";
import editorCss from "../editor/editor.module.css";

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
			<Button onClick={() => dispatch(pollingAdminAddPoll(event.id))}>
				Add Poll
			</Button>
		</div>
	);
}

function PollEntry({ poll }: { poll: Poll }) {
	const dispatch = useAppDispatch();
	const isSelected =
		useAppSelector(selectPollingAdminSelectedPollId) === poll.id;
	return (
		<div className={css.pollRow}>
			<div className={css.pollEntry + (isSelected ? " selected" : "")}>
				<span>{poll.title}</span>
				<div
					className={editorCss.bodyContainer}
					dangerouslySetInnerHTML={{ __html: poll.body }}
				/>
			</div>
			{poll.state && <div className={css.pollState}>{poll.state}</div>}
			<Button onClick={() => dispatch(setSelectedPollId(poll.id))}>
				Select
			</Button>
			<Button onClick={() => dispatch(pollingAdminDeletePoll(poll.id))}>
				Delete
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
