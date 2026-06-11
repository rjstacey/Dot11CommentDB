import EventTabs from "./eventsList";
import EventPanel from "./eventPanel";

import "./admin.css";

function PollAdmin() {
	return (
		<div className="admin-content">
			<EventTabs />
			<EventPanel />
		</div>
	);
}

export default PollAdmin;
