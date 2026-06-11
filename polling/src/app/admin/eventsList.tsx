import { Nav } from "react-bootstrap";
import { NavLink } from "react-router";
import { DateTime } from "luxon";
import { displayDate } from "@common";
import { useAppSelector } from "@/store/hooks";
import { selectPollingAdminEvents, Event } from "@/store/pollingAdmin";
import { EventCreateButton } from "./eventCreate";

function displayTime(d: string) {
	return DateTime.fromISO(d).toFormat("HH:mm");
}

function EventDescription({ event }: { event: Event }) {
	return (
		<div className="event-description">
			<span>{event.name || <i>(Blank)</i>}</span>
			<span>{displayDate(event.datetime)}</span>
			<span>{displayTime(event.datetime)}</span>
		</div>
	);
}

function EventsList() {
	const events = useAppSelector(selectPollingAdminEvents);

	return (
		<Nav className="event-tabs flex-column">
			<div className="event-create">
				<EventCreateButton />
			</div>
			{events.map((event) => (
				<Nav.Item key={event.id}>
					<Nav.Link as={NavLink} to={event.id.toString()}>
						<EventDescription event={event} />
					</Nav.Link>
				</Nav.Item>
			))}
		</Nav>
	);
}

export default EventsList;
