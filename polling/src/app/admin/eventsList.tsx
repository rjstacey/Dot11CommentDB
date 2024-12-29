import { DateTime } from "luxon";
import { displayDate } from "dot11-components";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
	selectPollingAdminEvents,
	pollingAdminSelectEvent,
	selectPollingAdminEventId,
	Event,
} from "@/store/pollingAdmin";
import css from "./admin.module.css";

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
				<EventTab key={event.id} event={event} />
			))}
		</div>
	);
}

export default EventTabsList;
