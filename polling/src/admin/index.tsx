import { DateTime } from "luxon";
import { displayDate, Button } from "dot11-components";
import { Event, Poll } from "../schemas/poll";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
	selectPollingAdminEvents,
	selectPollingAdminPolls,
	pollingAdminSelectEvent,
	selectPollingAdminEventId,
} from "../store/pollingAdmin";
import css from "./admin.module.css";
import CreateEventDropdown from "./createEvent";

function displayTime(d: string) {
	return DateTime.fromISO(d).toFormat("HH:mm");
}

function EventTab({ event }: { event: Event }) {
	const dispatch = useAppDispatch();
	const selectedEventId = useAppSelector(selectPollingAdminEventId);
	let cn = css.tab;
	if (event.id === selectedEventId) cn += " selected";
	return (
		<div
			key={event.id}
			className={cn}
			onClick={() => dispatch(pollingAdminSelectEvent(event.id))}
		>
			<span className={css.tabName}>{event.name}</span>
			<span className={css.tabDate}>{displayDate(event.datetime)}</span>
			<span className={css.tabDate}>{displayTime(event.datetime)}</span>
		</div>
	);
}

function EventTabsList() {
	const events = useAppSelector(selectPollingAdminEvents);
	return (
		<div className={css.tabList}>
			{events.map((event) => (
				<EventTab event={event} />
			))}
		</div>
	);
}

function EventActions() {
	return (
		<div className={css.eventActions}>
			<Button>Add Poll</Button>
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
	const polls = useAppSelector(selectPollingAdminPolls);

	return (
		<div className={css.eventPanel}>
			<EventActions />
			<div className={css.pollTable}>
				{polls.map((poll) => (
					<PollEntry poll={poll} />
				))}
			</div>
		</div>
	);
}

function Admin() {
	return (
		<div className={css.tabs}>
			<div className={css.header}>
				<EventTabsList />
				<div className={css.filler} />
				<div>
					<CreateEventDropdown />
				</div>
			</div>
			<div className={css.body}>
				<EventPanel />
			</div>
		</div>
	);
}

export default Admin;
