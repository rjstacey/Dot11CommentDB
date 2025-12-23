import { useAppSelector } from "@/store/hooks";
import cx from "classnames";
import {
	//selectPollingAdminSelectedPoll,
	selectPollAdminEvent,
} from "@/store/pollingAdmin";

import CreateEvent from "./createEvent";
import EventTabs from "./eventTabs";
import EventPanel from "./eventPanel";
//import { CurrentPoll } from "./PollEdit";
import css from "./admin.module.css";

function Admin() {
	const event = useAppSelector(selectPollAdminEvent);
	//const poll = useAppSelector(selectPollingAdminSelectedPoll);

	let panel: JSX.Element | null = null;
	if (event) panel = <EventPanel event={event} />;

	return (
		<div className={css.tabs}>
			<div className={css.header}>
				<EventTabs />
				<CreateEvent />
			</div>
			<div className={cx(css.eventPanel, "p-3")}>{panel}</div>
		</div>
	);
}

export default Admin;
