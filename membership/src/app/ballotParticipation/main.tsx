import { Row, Col } from "react-bootstrap";
import {
	AppTable,
	ShowFilters,
	SplitPanel,
	Panel,
	GlobalFilter,
} from "@common";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
	fields,
	setBallotParticipationSelected,
	selectBallotParticipationSelected,
	ballotParticipationSelectors,
	ballotParticipationActions,
} from "@/store/ballotParticipation";

import { MemberDetail } from "../members/detail";
import { useTableColumns } from "./tableColumns";

export function BallotParticipationTable() {
	const dispatch = useAppDispatch();
	const selected = useAppSelector(selectBallotParticipationSelected);

	const [columns, defaultTablesConfig] = useTableColumns();

	return (
		<>
			<Row className="align-items-center w-100">
				<Col>
					<ShowFilters
						selectors={ballotParticipationSelectors}
						actions={ballotParticipationActions}
						fields={fields}
					/>
				</Col>
				<Col xs={3} sm={2}>
					<GlobalFilter
						selectors={ballotParticipationSelectors}
						actions={ballotParticipationActions}
					/>
				</Col>
			</Row>

			<SplitPanel
				selectors={ballotParticipationSelectors}
				actions={ballotParticipationActions}
			>
				<Panel>
					<AppTable
						columns={columns}
						headerHeight={56}
						estimatedRowHeight={50}
						selectors={ballotParticipationSelectors}
						actions={ballotParticipationActions}
						defaultTablesConfig={defaultTablesConfig}
					/>
				</Panel>
				<Panel className="details-panel">
					<MemberDetail
						selected={selected}
						setSelected={(ids) =>
							dispatch(setBallotParticipationSelected(ids))
						}
					/>
				</Panel>
			</SplitPanel>
		</>
	);
}
