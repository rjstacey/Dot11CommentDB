import {
	AppTable,
	ShowFilters,
	SplitPanel,
	Panel,
	GlobalFilter,
} from "dot11-components";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
	fields,
	setSelected,
	selectBallotParticipationState,
	ballotParticipationSelectors,
	ballotParticipationActions,
} from "@/store/ballotParticipation";

import { MemberDetail } from "../members/detail";
import { useTableColumns } from "./tableColumns";

export function BallotParticipationTable() {
	const dispatch = useAppDispatch();
	const { selected } = useAppSelector(selectBallotParticipationState);

	const [columns, defaultTablesConfig] = useTableColumns();

	return (
		<>
			<div
				style={{ display: "flex", width: "100%", alignItems: "center" }}
			>
				<ShowFilters
					selectors={ballotParticipationSelectors}
					actions={ballotParticipationActions}
					fields={fields}
				/>
				<GlobalFilter
					selectors={ballotParticipationSelectors}
					actions={ballotParticipationActions}
				/>
			</div>

			<SplitPanel
				selectors={ballotParticipationSelectors}
				actions={ballotParticipationActions}
			>
				<Panel>
					<AppTable
						columns={columns}
						headerHeight={40}
						estimatedRowHeight={50}
						selectors={ballotParticipationSelectors}
						actions={ballotParticipationActions}
						defaultTablesConfig={defaultTablesConfig}
					/>
				</Panel>
				<Panel className="details-panel">
					<MemberDetail
						selected={selected}
						setSelected={(ids) => dispatch(setSelected(ids))}
					/>
				</Panel>
			</SplitPanel>
		</>
	);
}
