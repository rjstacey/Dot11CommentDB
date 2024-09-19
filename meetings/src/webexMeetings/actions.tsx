import { useNavigate } from "react-router-dom";
import {
	ActionButton,
	SplitPanelButton,
	TableColumnSelector,
} from "dot11-components";

import {
	webexMeetingsSelectors,
	webexMeetingsActions,
} from "../store/webexMeetings";

import SessionSelectorNav from "../components/SessionSelectorNav";
import CopyWebexMeetingListButton from "./CopyWebexMeetingList";

import { tableColumns } from "./table";

function WebexMeetingsActions() {
	const navigate = useNavigate();
	const refresh = () => navigate(0);

	return (
		<div className="top-row">
			<SessionSelectorNav allowShowDateRange />

			<div style={{ display: "flex" }}>
				<TableColumnSelector
					selectors={webexMeetingsSelectors}
					actions={webexMeetingsActions}
					columns={tableColumns}
				/>
				<SplitPanelButton
					selectors={webexMeetingsSelectors}
					actions={webexMeetingsActions}
				/>
				<CopyWebexMeetingListButton />
				<ActionButton
					name="refresh"
					title="Refresh"
					onClick={refresh}
				/>
			</div>
		</div>
	);
}

export default WebexMeetingsActions;
