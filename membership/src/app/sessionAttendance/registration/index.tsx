import { AppTable, ShowFilters } from "@components/table";
import {
	sessionRegistrationSelectors,
	sessionRegistrationActions,
	fields,
} from "@/store/sessionRegistration";
import { SplitTableButtonGroup } from "@components/table";
import { tableColumns, defaultTablesConfig } from "./tableColumns";
import { SessionAttendanceSubmenu } from "../submenu";

export function SessionRegistrationTable() {
	return (
		<>
			<SessionAttendanceSubmenu style={{ order: 2 }} />
			<SplitTableButtonGroup
				style={{ order: 3 }}
				selectors={sessionRegistrationSelectors}
				actions={sessionRegistrationActions}
				columns={tableColumns}
			/>
			<div
				style={{
					order: 10,
					width: "100%",
					height: "100%",
					display: "flex",
					flexDirection: "column",
				}}
			>
				<ShowFilters
					fields={fields}
					selectors={sessionRegistrationSelectors}
					actions={sessionRegistrationActions}
				/>
				<AppTable
					columns={tableColumns}
					headerHeight={40}
					estimatedRowHeight={50}
					defaultTablesConfig={defaultTablesConfig}
					selectors={sessionRegistrationSelectors}
					actions={sessionRegistrationActions}
				/>
			</div>
		</>
	);
}

export default SessionRegistrationTable;
