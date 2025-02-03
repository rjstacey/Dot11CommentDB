import { AppTable, ShowFilters } from "dot11-components";
import {
	sessionRegistrationSelectors,
	sessionRegistrationActions,
	fields,
} from "@/store/sessionRegistration";

import {
	tableColumns,
	defaultTablesConfig,
} from "./sessionRegistrationTableColumns";

function SessionRegistrationTable() {
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
