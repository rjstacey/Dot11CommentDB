import { AppTable, ShowFilters, SplitTableButtonGroup } from "@common";
import {
	sessionAttendanceSummarySelectors,
	sessionAttendanceSummaryActions,
	fields,
} from "@/store/sessionAttendanceSummary";
import { tableColumns, defaultTablesConfig } from "./tableColumns";
import { Main } from "../main";

export function SessionAttendanceSummaryTable() {
	return (
		<>
			<SplitTableButtonGroup
				style={{ order: 3 }}
				selectors={sessionAttendanceSummarySelectors}
				actions={sessionAttendanceSummaryActions}
				columns={tableColumns}
			/>
			<Main>
				<ShowFilters
					fields={fields}
					selectors={sessionAttendanceSummarySelectors}
					actions={sessionAttendanceSummaryActions}
				/>
				<AppTable
					columns={tableColumns}
					headerHeight={40}
					estimatedRowHeight={50}
					defaultTablesConfig={defaultTablesConfig}
					selectors={sessionAttendanceSummarySelectors}
					actions={sessionAttendanceSummaryActions}
				/>
			</Main>
		</>
	);
}

export default SessionAttendanceSummaryTable;
