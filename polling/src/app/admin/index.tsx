import cx from "classnames";

import CreateEvent from "./createEvent";
import EventTabs from "./eventTabs";
import EventPanel from "./eventPanel";

import css from "./admin.module.css";

function PollAdmin() {
	return (
		<div className={css.tabs}>
			<div className={css.header}>
				<EventTabs />
				<CreateEvent />
			</div>
			<div className={cx(css.eventPanel, "p-3")}>{<EventPanel />}</div>
		</div>
	);
}

export default PollAdmin;
