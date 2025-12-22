import { useAppSelector } from "@/store/hooks";
import {
	selectPollingAdminSelectedPoll,
	selectPollAdminEvent,
} from "@/store/pollingAdmin";

import CreateEvent from "./createEvent";
import EventTabs from "./eventTabs";
import EventPanel from "./eventPanel";
import { CurrentPoll } from "./currentPoll";
import css from "./admin.module.css";

function Admin() {
	const event = useAppSelector(selectPollAdminEvent);
	const poll = useAppSelector(selectPollingAdminSelectedPoll);

	let panel: JSX.Element | null = null;
	if (event)
		panel = poll ? (
			<CurrentPoll event={event} poll={poll} />
		) : (
			<EventPanel event={event} />
		);

	return (
		<div className={css.tabs}>
			<div className={css.header}>
				<EventTabs />
				<CreateEvent />
			</div>
			<div className={css.eventPanel}>{panel}</div>
		</div>
	);
}

export default Admin;
