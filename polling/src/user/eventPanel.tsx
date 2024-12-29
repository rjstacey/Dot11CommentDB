import { DateTime } from "luxon";
import { displayDate } from "dot11-components";
import { useAppSelector } from "../store/hooks";
import {
	selectPollingUserEvent,
	selectPollingUserPolls,
	Poll,
	Event,
} from "../store/pollingUser";
import css from "./user.module.css";
import editorCss from "../editor/editor.module.css";

function displayTime(d: string) {
	return DateTime.fromISO(d).toFormat("HH:mm");
}

function EventSummary({ event }: { event: Event }) {
	return (
		<div key={event.id} className={css.event}>
			<span className={css.tabName}>{event.name}</span>
			<span className={css.tabDate}>{displayDate(event.datetime)}</span>
			<span className={css.tabDate}>{displayTime(event.datetime)}</span>
		</div>
	);
}

function PollEntry({ poll }: { poll: Poll }) {
	return (
		<div className={css.pollRow}>
			<div className={css.pollEntry}>
				<span>{poll.title}</span>
				<div
					className={editorCss.bodyContainer}
					dangerouslySetInnerHTML={{ __html: poll.body }}
				/>
			</div>
		</div>
	);
}

function EventPanel() {
	const event = useAppSelector(selectPollingUserEvent);
	const polls = useAppSelector(selectPollingUserPolls);

	if (!event) return null;

	return (
		<div className={css.body}>
			<EventSummary event={event} />
			<div className={css.pollTable}>
				{polls.map((poll) => (
					<PollEntry key={poll.id} poll={poll} />
				))}
			</div>
		</div>
	);
}

export default EventPanel;
