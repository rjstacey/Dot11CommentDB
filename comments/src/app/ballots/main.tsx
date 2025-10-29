import { AppTable, ShowFilters, SplitPanel, Panel } from "@common";
import { useAppSelector } from "@/store/hooks";
import {
	fields,
	selectBallotsAccess,
	ballotsSelectors,
	ballotsActions,
	AccessLevel,
} from "@/store/ballots";

import { BallotActions } from "./actions";
import BallotDetail from "./BallotDetail";
import { tableColumns, defaultTablesConfig } from "./tableColumns";

function Ballots() {
	const access = useAppSelector(selectBallotsAccess);

	return (
		<>
			<BallotActions />

			<ShowFilters
				selectors={ballotsSelectors}
				actions={ballotsActions}
				fields={fields}
			/>

			<SplitPanel selectors={ballotsSelectors} actions={ballotsActions}>
				<Panel>
					<AppTable
						defaultTablesConfig={defaultTablesConfig}
						columns={tableColumns}
						headerHeight={52}
						estimatedRowHeight={52}
						selectors={ballotsSelectors}
						actions={ballotsActions}
					/>
				</Panel>
				<Panel className="details-panel">
					<BallotDetail
						access={access}
						readOnly={access < AccessLevel.admin}
					/>
				</Panel>
			</SplitPanel>
		</>
	);
}

export default Ballots;
