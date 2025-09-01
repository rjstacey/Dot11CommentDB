import { AppTable, ShowFilters } from "@components/table";
import {
	sessionRegistrationSelectors,
	sessionRegistrationActions,
	fields,
} from "@/store/sessionRegistration";
import { SplitTableButtonGroup } from "@components/table";
import { tableColumns, defaultTablesConfig } from "./tableColumns";
import { SessionAttendanceSubmenu } from "../submenu";
import { Main } from "../main";

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
			<Main>
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
			</Main>
		</>
	);
}

export default SessionRegistrationTable;
