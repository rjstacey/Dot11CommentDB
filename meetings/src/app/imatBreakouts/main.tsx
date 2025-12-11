import {
	AppTable,
	SplitPanel,
	Panel,
	displayDateRange,
	RowGetterProps,
} from "@common";

import {
	getField,
	imatBreakoutsSelectors,
	imatBreakoutsActions,
} from "@/store/imatBreakouts";
import type { ImatMeeting } from "@/store/imatMeetings";

import { ImatBreakoutsDetails } from "./details";
import { tableColumns, defaultTablesConfig } from "./tableColumns";

export function ImatMeetingInfo({
	imatMeeting,
}: {
	imatMeeting?: ImatMeeting;
}) {
	const content = imatMeeting ? (
		<>
			<span>{imatMeeting.name}</span>
			<span>{displayDateRange(imatMeeting.start, imatMeeting.end)}</span>
			<span>{imatMeeting.timezone}</span>
		</>
	) : null;
	return (
		<div style={{ display: "flex", flexDirection: "column" }}>
			{content}
		</div>
	);
}

/*
 * Don't display Data and Time if it is the same as previous line
 */
function breakoutsRowGetter({ rowIndex, ids, entities }: RowGetterProps) {
	let b = entities[ids[rowIndex]];
	b = {
		...b,
		dayDate: getField(b, "dayDate"),
		timeRange: getField(b, "timeRange"),
	};
	if (rowIndex > 0) {
		const b_prev = entities[ids[rowIndex - 1]];
		if (b.dayDate === getField(b_prev, "dayDate")) {
			b = { ...b, dayDate: "" };
			if (b.timeRange === getField(b_prev, "timeRange"))
				b = { ...b, timeRange: "" };
		}
	}
	return b;
}

export function ImatBreakoutsMain() {
	return (
		<SplitPanel
			selectors={imatBreakoutsSelectors}
			actions={imatBreakoutsActions}
		>
			<Panel>
				<AppTable
					fixed
					columns={tableColumns}
					headerHeight={52}
					estimatedRowHeight={48}
					rowGetter={breakoutsRowGetter}
					defaultTablesConfig={defaultTablesConfig}
					selectors={imatBreakoutsSelectors}
					actions={imatBreakoutsActions}
				/>
			</Panel>
			<Panel className="details-panel">
				<ImatBreakoutsDetails />
			</Panel>
		</SplitPanel>
	);
}
