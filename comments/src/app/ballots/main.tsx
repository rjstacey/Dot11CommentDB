import { AppTable, ShowFilters, SplitPanel, Panel } from "@common";
import { useAppSelector } from "@/store/hooks";
import {
	fields,
	selectBallotsAccess,
	ballotsSelectors,
	ballotsActions,
	AccessLevel,
} from "@/store/ballots";

import { BallotsActions } from "./actions";
import { BallotsDetail } from "./details";
import { tableColumns, defaultTablesConfig } from "./tableColumns";

export function BallotsMain() {
	const access = useAppSelector(selectBallotsAccess);
	const readOnly = access < AccessLevel.admin;

	return (
		<>
			<BallotsActions />

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
					<BallotsDetail access={access} readOnly={readOnly} />
				</Panel>
			</SplitPanel>
		</>
	);
}
