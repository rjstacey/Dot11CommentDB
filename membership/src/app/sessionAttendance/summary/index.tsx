import { Row, Col } from "react-bootstrap";
import { AppTable, ShowFilters, GlobalFilter } from "@common";
import {
	sessionAttendanceSummarySelectors,
	sessionAttendanceSummaryActions,
	fields,
} from "@/store/sessionAttendanceSummary";
import { tableColumns, defaultTablesConfig } from "./tableColumns";

export function SessionAttendanceSummaryTable() {
	return (
		<>
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
			<div className="w-100 flex-grow-1">
				<AppTable
					columns={tableColumns}
					headerHeight={40}
					estimatedRowHeight={50}
					defaultTablesConfig={defaultTablesConfig}
					selectors={sessionAttendanceSummarySelectors}
					actions={sessionAttendanceSummaryActions}
				/>
			</div>
		</>
	);
}

export default SessionAttendanceSummaryTable;
