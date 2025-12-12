import { AppTable, SplitPanel, Panel } from "@common";
import { sessionsSelectors, sessionsActions } from "@/store/sessions";
import { SessionsDetails } from "./details";
import { tableColumns, defaultTablesConfig } from "./tableColumns";

export function SessionsMain() {
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
				<SessionsDetails />
			</Panel>
		</SplitPanel>
	);
}
