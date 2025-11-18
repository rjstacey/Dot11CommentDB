import { Row, Col } from "react-bootstrap";
import {
	AppTable,
	ShowFilters,
	GlobalFilter,
	SplitTableButtonGroup,
} from "@common";
import {
	sessionAttendanceSummarySelectors,
	sessionAttendanceSummaryActions,
	fields,
} from "@/store/sessionAttendanceSummary";
import { tableColumns, defaultTablesConfig } from "./tableColumns";
import { Main } from "../main";

export function SessionAttendanceSummaryTable() {
	return (
		<>
			<SplitTableButtonGroup
				xs="auto"
				className="ms-auto"
				style={{ order: 3 }}
				selectors={sessionAttendanceSummarySelectors}
				actions={sessionAttendanceSummaryActions}
				columns={tableColumns}
			/>
			<Main>
				<Row className="align-items-center w-100">
					<Col>
						<ShowFilters
							selectors={sessionAttendanceSummarySelectors}
							actions={sessionAttendanceSummaryActions}
							fields={fields}
						/>
					</Col>
					<Col xs={3} sm={2}>
						<GlobalFilter
							selectors={sessionAttendanceSummarySelectors}
							actions={sessionAttendanceSummaryActions}
						/>
					</Col>
				</Row>
				<AppTable
					columns={tableColumns}
					headerHeight={40}
					estimatedRowHeight={50}
					defaultTablesConfig={defaultTablesConfig}
					selectors={sessionAttendanceSummarySelectors}
					actions={sessionAttendanceSummaryActions}
				/>
			</Main>
		</>
	);
}

export default SessionAttendanceSummaryTable;
