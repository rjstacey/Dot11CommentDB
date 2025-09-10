import { AppTable, ShowFilters, SplitPanel, Panel } from "@common";
import { useAppSelector } from "@/store/hooks";
import { selectBallotsAccess } from "@/store/ballots";
import { fields, votersSelectors, votersActions } from "@/store/voters";

import { tableColumns, defaultTablesConfig } from "./tableColumns";
import VoterDetail from "./detail";

function VotersTable() {
	const access = useAppSelector(selectBallotsAccess);

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
					<VoterDetail access={access} />
				</Panel>
			</SplitPanel>
		</>
	);
}

export default VotersTable;
