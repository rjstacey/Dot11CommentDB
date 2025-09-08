import { AppTable, ShowFilters, SplitPanel, Panel } from "@common";

import { useAppSelector } from "@/store/hooks";
import { AccessLevel } from "@/store/user";
import {
	fields,
	selectBallotsAccess,
	ballotsSelectors,
	ballotsActions,
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
						headerHeight={42}
						estimatedRowHeight={42}
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
