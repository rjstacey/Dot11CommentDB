import { AppTable, ShowFilters, SplitTableButtonGroup } from "@common";
import {
	sessionRegistrationSelectors,
	sessionRegistrationActions,
	fields,
} from "@/store/sessionRegistration";
import { tableColumns, defaultTablesConfig } from "./tableColumns";
import { Main } from "../main";

export function SessionRegistrationTable() {
	return (
		<>
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
