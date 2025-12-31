import { Nav } from "react-bootstrap";
import { DateTime } from "luxon";
import { displayDate } from "@common";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
	selectPollingAdminEvents,
	pollingAdminSelectEvent,
	selectPollingAdminEventId,
	Event,
} from "@/store/pollingAdmin";
import CreateEvent from "./createEvent";
import css from "./admin.module.css";

function displayTime(d: string) {
	return DateTime.fromISO(d).toFormat("HH:mm");
}

function EventDescription({ event }: { event: Event }) {
	return (
		<div className={css["event-description"]}>
			<span>{event.name || <i>(Blank)</i>}</span>
			<span>{displayDate(event.datetime)}</span>
			<span>{displayTime(event.datetime)}</span>
		</div>
	);
}

function EventTabs() {
	const dispatch = useAppDispatch();
	const events = useAppSelector(selectPollingAdminEvents);
	const selectedEventId = useAppSelector(selectPollingAdminEventId);
	const setSelectedEventId = (eventId: string | null) =>
		dispatch(pollingAdminSelectEvent(Number(eventId)));

	return (
		<Nav
			variant="tabs"
			onSelect={setSelectedEventId}
			activeKey={selectedEventId || undefined}
			className={css["event-tabs"]}
		>
			{events.map((event) => (
				<Nav.Item key={event.id}>
					<Nav.Link eventKey={event.id}>
						<EventDescription event={event} />
					</Nav.Link>
				</Nav.Item>
			))}
			<div className={css["event-create"]}>
				<CreateEvent />
			</div>
		</Nav>
	);
}

export default EventTabs;
