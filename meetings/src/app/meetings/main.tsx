import {
	AppTable,
	SplitPanel,
	Panel,
	ShowFilters,
	RowGetterProps,
} from "@common";

import { useAppSelector } from "@/store/hooks";
import {
	fields,
	getField,
	selectUiProperties,
	meetingsSelectors,
	meetingsActions,
	SyncedMeeting,
} from "@/store/meetings";

import MeetingsCalendar from "./MeetingsCalendar";
import { MeetingsDetails } from "./details";
import ShowSlots from "./ShowSlots";

import { tableColumns, defaultTablesConfig } from "./tableColumns";

/*
 * Don't display date and time if it is the same as previous line
 */
function rowGetter({ rowIndex, ids, entities }: RowGetterProps<SyncedMeeting>) {
	const meeting = entities[ids[rowIndex]]!;
	const b = {
		...meeting,
		day: getField(meeting, "day"),
		date: getField(meeting, "date"),
		dayDate: getField(meeting, "dayDate"),
		timeRange: getField(meeting, "timeRange"),
		location: getField(meeting, "location"),
	};
	if (rowIndex > 0) {
		const b_prev = entities[ids[rowIndex - 1]]!;
		if (b.day === getField(b_prev, "day")) {
			b.day = "";
			if (b.date === getField(b_prev, "date")) {
				b.date = "";
				b.dayDate = "";
				if (b.timeRange === getField(b_prev, "timeRange"))
					b.timeRange = "";
			}
		}
	}
	return b;
}

export function MeetingsMain() {
	const showDays: number = useAppSelector(selectUiProperties).showDays | 0;

	return (
		<SplitPanel selectors={meetingsSelectors} actions={meetingsActions}>
			{showDays > 0 ? (
				<Panel style={{ display: "flex", flexDirection: "column" }}>
					<ShowSlots />
					<MeetingsCalendar nDays={showDays} />
				</Panel>
			) : (
				<Panel
					style={{
						display: "flex",
						flexDirection: "column",
						margin: "10px 0 10px 10px",
					}}
				>
					<ShowFilters
						selectors={meetingsSelectors}
						actions={meetingsActions}
						fields={fields}
					/>
					<div style={{ display: "flex", flex: 1 }}>
						<AppTable
							defaultTablesConfig={defaultTablesConfig}
							columns={tableColumns}
							headerHeight={46}
							estimatedRowHeight={32}
							measureRowHeight
							selectors={meetingsSelectors}
							actions={meetingsActions}
							rowGetter={rowGetter}
						/>
					</div>
				</Panel>
			)}
			<Panel className="details-panel">
				<MeetingsDetails />
			</Panel>
		</SplitPanel>
	);
}
