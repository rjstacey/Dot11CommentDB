import { AppTable, ShowFilters, SplitPanel, Panel } from "@common";
import { fields, votersSelectors, votersActions } from "@/store/voters";

import { tableColumns, defaultTablesConfig } from "./tableColumns";
import { VotersDetail } from "./detail";

export function VotersMain() {
	return (
		<>
			<ShowFilters
				fields={fields}
				selectors={votersSelectors}
				actions={votersActions}
			/>

			<SplitPanel selectors={votersSelectors} actions={votersActions}>
				<Panel>
					<AppTable
						fitWidth
						fixed
						columns={tableColumns}
						headerHeight={36}
						estimatedRowHeight={36}
						selectors={votersSelectors}
						actions={votersActions}
						defaultTablesConfig={defaultTablesConfig}
					/>
				</Panel>
				<Panel className="details-panel">
					<VotersDetail />
				</Panel>
			</SplitPanel>
		</>
	);
}
