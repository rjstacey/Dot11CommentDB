import { ActionIcon, Button } from "dot11-components";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
	selectPollingAdminPolls,
	selectPollingAdminSelectedPollId,
	pollingAdminEventPublish,
	pollingAdminAddPoll,
	Event,
	Poll,
	setSelectedPollId,
	pollingAdminDeletePoll,
	defaultMotion,
	defaultStrawpoll,
} from "@/store/pollingAdmin";
import css from "./admin.module.css";
import editorCss from "@/components/editor/editor.module.css";

function EventActions({ event, polls }: { event: Event; polls: Poll[] }) {
	const dispatch = useAppDispatch();
	const createMotion = () =>
		dispatch(pollingAdminAddPoll(defaultMotion(event, polls)));
	const createStrawpoll = () =>
		dispatch(pollingAdminAddPoll(defaultStrawpoll(event, polls)));

	function toggleIsPublished() {
		dispatch(pollingAdminEventPublish(event.id, !event.isPublished));
	}

	return (
		<div className={css.eventActions}>
			<Button isActive={event.isPublished} onClick={toggleIsPublished}>
				Publish
			</Button>
			<div>
				<Button onClick={createMotion}>+ Motion</Button>
				<Button onClick={createStrawpoll}>+ Strawpoll</Button>
			</div>
		</div>
	);
}

function PollEntry({ poll }: { poll: Poll }) {
	const dispatch = useAppDispatch();
	const isSelected =
		useAppSelector(selectPollingAdminSelectedPollId) === poll.id;
	return (
		<div className={css.pollRow}>
			<div
				className={css.pollEntry + (isSelected ? " selected" : "")}
				onClick={() => dispatch(setSelectedPollId(poll.id))}
			>
				<span className={css.pollTitle}>{poll.title}</span>
				<div
					className={editorCss.bodyContainer}
					dangerouslySetInnerHTML={{ __html: poll.body }}
				/>
			</div>
			{poll.state && <div className={css.pollState}>{poll.state}</div>}
			<ActionIcon
				name="delete"
				onClick={() => dispatch(pollingAdminDeletePoll(poll.id))}
			/>
		</div>
	);
}

function EventPolls({ polls }: { polls: Poll[] }) {
	return (
		<div className={css.eventPolls}>
			{polls.map((poll) => (
				<PollEntry key={poll.id} poll={poll} />
			))}
		</div>
	);
}

function EventPanel({ event }: { event: Event }) {
	const polls = useAppSelector(selectPollingAdminPolls);

	if (!event) return null;

	return (
		<>
			<EventActions event={event} polls={polls} />
			<EventPolls polls={polls} />
		</>
	);
}

export default EventPanel;
