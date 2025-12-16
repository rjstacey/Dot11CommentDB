import { AppTable, SplitPanel, Panel } from "@common";

import { epollsSelectors, epollsActions } from "@/store/epolls";

import { tableColumns, defaultTablesConfig } from "./tableColumns";
import { EpollsDetail } from "./detail";

export function EpollsMain() {
	return (
		<div className="table-container" style={{ alignItems: "unset" }}>
			<SplitPanel selectors={epollsSelectors} actions={epollsActions}>
				<Panel>
					<AppTable
						columns={tableColumns}
						headerHeight={28}
						estimatedRowHeight={64}
						selectors={epollsSelectors}
						actions={epollsActions}
						defaultTablesConfig={defaultTablesConfig}
					/>
				</Panel>
				<Panel className="details-panel">
					<EpollsDetail />
				</Panel>
			</SplitPanel>
		</div>
	);
}
