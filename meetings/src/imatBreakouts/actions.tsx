import { useNavigate, useParams } from "react-router-dom";
import {
	ActionButton,
	TableColumnSelector,
	SplitPanelButton,
} from "dot11-components";

import {
	imatBreakoutsSelectors,
	imatBreakoutsActions,
} from "../store/imatBreakouts";

import ImatMeetingSelector from "../components/ImatMeetingSelector";
import ImatMeetingInfo from "../components/ImatMeetingInfo";

import { tableColumns } from "./table";
import { refresh } from "./route";

function ImatBreakoutsActions() {
	const navigate = useNavigate();

	const imatMeetingId = Number(useParams().meetingNumber);
	const setImatMeetingId = (imatMeetingId: number | null) => {
		navigate(imatMeetingId ? imatMeetingId.toString() : "");
	};

	return (
		<div className="top-row">
			<ImatMeetingSelector
				value={imatMeetingId}
				onChange={setImatMeetingId}
			/>

			<ImatMeetingInfo imatMeetingId={imatMeetingId} />

			<div style={{ display: "flex" }}>
				<TableColumnSelector
					selectors={imatBreakoutsSelectors}
					actions={imatBreakoutsActions}
					columns={tableColumns}
				/>
				<SplitPanelButton
					selectors={imatBreakoutsSelectors}
					actions={imatBreakoutsActions}
				/>
				<ActionButton
					name="refresh"
					title="Refresh"
					onClick={refresh}
				/>
			</div>
		</div>
	);
}

export default ImatBreakoutsActions;
