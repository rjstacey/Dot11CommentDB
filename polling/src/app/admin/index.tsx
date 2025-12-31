import EventTabs from "./eventTabs";
import EventPanel from "./eventPanel";

import css from "./admin.module.css";

function PollAdmin() {
	return (
		<div className={css["admin-content"]}>
			<EventTabs />
			<EventPanel />
		</div>
	);
}

export default PollAdmin;
