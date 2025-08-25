import { AppTable, ShowFilters } from "@components/table";
import {
	sessionRegistrationSelectors,
	sessionRegistrationActions,
	fields,
} from "@/store/sessionRegistration";

import { tableColumns, defaultTablesConfig } from "./tableColumns";

export function SessionRegistrationTable() {
	return (
		<div className="table-container">
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
	);
}

export default SessionRegistrationTable;
