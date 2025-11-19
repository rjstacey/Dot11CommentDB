import { Row, Col } from "react-bootstrap";
import {
	AppTable,
	ShowFilters,
	GlobalFilter,
	SplitPanel,
	Panel,
} from "@common";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
	fields,
	selectMembersState,
	setSelected,
	membersSelectors,
	membersActions,
} from "@/store/members";

import { tableColumns, defaultTablesConfig } from "./tableColumns";
import { MemberDetail } from "./detail";

export function MembersTable() {
	const dispatch = useAppDispatch();
	const { selected } = useAppSelector(selectMembersState);

	return (
		<>
			<Row className="align-items-center w-100">
				<Col>
					<ShowFilters
						selectors={membersSelectors}
						actions={membersActions}
						fields={fields}
					/>
				</Col>
				<Col xs={3} sm={2}>
					<GlobalFilter
						selectors={membersSelectors}
						actions={membersActions}
					/>
				</Col>
			</Row>

			<SplitPanel selectors={membersSelectors} actions={membersActions}>
				<Panel>
					<AppTable
						defaultTablesConfig={defaultTablesConfig}
						columns={tableColumns}
						headerHeight={50}
						estimatedRowHeight={50}
						selectors={membersSelectors}
						actions={membersActions}
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

export default MembersTable;
