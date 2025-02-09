import { Button } from "dot11-components";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
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
	pollingAdminUpdateEvent,
	defaultMotion,
	defaultStrawpoll,
} from "@/store/pollingAdmin";
import LabeledToggle from "@/components/toggle";
import css from "./admin.module.css";
import editorCss from "@/components/editor/editor.module.css";

const onOffOptions: { label: string; value: boolean }[] = [
	{ value: true, label: "On" },
	{ value: false, label: "Off" },
];
function PollAutoNumber({
	value,
	onChange,
}: {
	value: boolean;
	onChange: (value: boolean) => void;
}) {
	return (
		<LabeledToggle
			label="Auto number:"
			options={onOffOptions}
			value={value}
			onChange={onChange}
		/>
	);
}

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
			<PollAutoNumber
				value={event.autoNumber}
				onChange={(autoNumber) =>
					dispatch(
						pollingAdminUpdateEvent({
							id: event.id,
							changes: { autoNumber },
						})
					)
				}
			/>

			<Button onClick={createMotion}>+ Motion</Button>
			<Button onClick={createStrawpoll}>+ Strawpoll</Button>
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
				<span className={css.pollTitle}>{poll.title}</span>
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
			<EventActions event={event} polls={polls} />
			<div className={css.pollTable}>
				{polls.map((poll) => (
					<PollEntry key={poll.id} poll={poll} />
				))}
			</div>
		</>
	);
}

export default EventPanel;
