import { useNavigate } from "react-router-dom";
import {
	ActionButton,
	ButtonGroup,
	TableViewSelector,
	TableColumnSelector,
} from "dot11-components";

import {
	imatMeetingsSelectors,
	imatMeetingsActions,
} from "../store/imatMeetings";

import { tableColumns } from "./table";

function ImatMeetingsActions() {
	const navigate = useNavigate();
	const refresh = () => navigate(".", { replace: true });
	return (
		<div className="top-row">
			<div>IMAT Sessions</div>
			<div style={{ display: "flex" }}>
				<ButtonGroup>
					<div>Table view</div>
					<div style={{ display: "flex" }}>
						<TableViewSelector
							selectors={imatMeetingsSelectors}
							actions={imatMeetingsActions}
						/>
						<TableColumnSelector
							selectors={imatMeetingsSelectors}
							actions={imatMeetingsActions}
							columns={tableColumns}
						/>
					</div>
				</ButtonGroup>
				<ActionButton
					name="refresh"
					title="Refresh"
					onClick={refresh}
				/>
			</div>
		</div>
	);
}

export default ImatMeetingsActions;
