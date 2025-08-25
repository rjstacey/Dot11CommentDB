import { AppTable, SplitPanel, Panel, ShowFilters } from "@components/table";

import {
	sessionAttendeesSelectors,
	sessionAttendeesActions,
	fields,
} from "@/store/sessionAttendees";

import { MemberAttendanceDetail } from "./detail";
import { tableColumns, defaultTablesConfig } from "./tableColumns";

export function SessionAttendanceTable() {
	return (
		<div className="table-container">
			<ShowFilters
				fields={fields}
				selectors={sessionAttendeesSelectors}
				actions={sessionAttendeesActions}
			/>
			<SplitPanel
				selectors={sessionAttendeesSelectors}
				actions={sessionAttendeesActions}
			>
				<Panel>
					<AppTable
						columns={tableColumns}
						headerHeight={40}
						estimatedRowHeight={50}
						defaultTablesConfig={defaultTablesConfig}
						selectors={sessionAttendeesSelectors}
						actions={sessionAttendeesActions}
					/>
				</Panel>
				<Panel className="details-panel">
					<MemberAttendanceDetail />
				</Panel>
			</SplitPanel>
		</div>
	);
}

export default SessionAttendanceTable;
