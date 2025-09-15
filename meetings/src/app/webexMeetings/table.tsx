import { AppTable, SplitPanel, Panel, RowGetterProps } from "@common";
import {
	getField,
	webexMeetingsSelectors,
	webexMeetingsActions,
	SyncedWebexMeeting,
} from "@/store/webexMeetings";

import WebexMeetingDetail from "./WebexMeetingDetail";

import { tableColumns, defaultTablesConfig } from "./tableColumns";

/*
 * Don't display date and time if it is the same as previous line
 */
function webexMeetingsRowGetter({
	rowIndex,
	ids,
	entities,
}: RowGetterProps<SyncedWebexMeeting>) {
	const webexMeeting = entities[ids[rowIndex]]!;
	let b = {
		...webexMeeting,
		dayDate: getField(webexMeeting, "dayDate"),
		timeRange: getField(webexMeeting, "timeRange"),
	};
	if (rowIndex > 0) {
		const b_prev = entities[ids[rowIndex - 1]]!;
		if (b.dayDate === getField(b_prev, "dayDate")) {
			b = { ...b, dayDate: "" };
			if (b.timeRange === getField(b_prev, "timeRange"))
				b = { ...b, timeRange: "" };
		}
	}
	return b;
}

function WebexMeetings() {
	return (
		<>
			<SplitPanel
				selectors={webexMeetingsSelectors}
				actions={webexMeetingsActions}
			>
				<Panel>
					<AppTable
						defaultTablesConfig={defaultTablesConfig}
						columns={tableColumns}
						headerHeight={46}
						estimatedRowHeight={36}
						rowGetter={webexMeetingsRowGetter}
						selectors={webexMeetingsSelectors}
						actions={webexMeetingsActions}
					/>
				</Panel>
				<Panel className="details-panel">
					<WebexMeetingDetail />
				</Panel>
			</SplitPanel>
		</>
	);
}

export default WebexMeetings;
