import { Row, Col } from "react-bootstrap";
import { AppTable, ShowFilters, GlobalFilter } from "@common";
import {
	sessionRegistrationSelectors,
	sessionRegistrationActions,
	fields,
} from "@/store/sessionRegistration";
import { tableColumns, defaultTablesConfig } from "./tableColumns";

export function SessionRegistrationTable() {
	return (
		<>
			<Row className="align-items-center w-100">
				<Col>
					<ShowFilters
						selectors={sessionRegistrationSelectors}
						actions={sessionRegistrationActions}
						fields={fields}
					/>
				</Col>
				<Col xs={3} sm={2}>
					<GlobalFilter
						selectors={sessionRegistrationSelectors}
						actions={sessionRegistrationActions}
					/>
				</Col>
			</Row>
			<div className="w-100 flex-grow-1">
				<AppTable
					columns={tableColumns}
					headerHeight={50}
					estimatedRowHeight={50}
					defaultTablesConfig={defaultTablesConfig}
					selectors={sessionRegistrationSelectors}
					actions={sessionRegistrationActions}
				/>
			</div>
		</>
	);
}

export default SessionRegistrationTable;
