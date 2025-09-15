import { AppTable, SplitPanel, Panel } from "@common";
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
					headerHeight={52}
					estimatedRowHeight={48}
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
