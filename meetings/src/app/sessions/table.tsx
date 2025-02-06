import { AppTable, SplitPanel, Panel } from "dot11-components";
import { sessionsSelectors, sessionsActions } from "@/store/sessions";
import SessionDetails from "./SessionDetails";
import { tableColumns, defaultTablesConfig } from "./tableColumns";

function SessionsTable() {
	return (
		<SplitPanel selectors={sessionsSelectors} actions={sessionsActions}>
			<Panel>
				<AppTable
					defaultTablesConfig={defaultTablesConfig}
					columns={tableColumns}
					headerHeight={44}
					estimatedRowHeight={44}
					selectors={sessionsSelectors}
					actions={sessionsActions}
				/>
			</Panel>
			<Panel className="details-panel">
				<SessionDetails />
			</Panel>
		</SplitPanel>
	);
}

export default SessionsTable;
