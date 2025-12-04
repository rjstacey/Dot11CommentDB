import { Row, Col } from "react-bootstrap";
import {
	AppTable,
	ShowFilters,
	GlobalFilter,
	Panel,
	SplitPanel,
} from "@common";
import {
	sessionRegistrationSelectors,
	sessionRegistrationActions,
	fields,
} from "@/store/sessionRegistration";
import { tableColumns, defaultTablesConfig } from "./tableColumns";
import { RegistrationDetail } from "./detail";

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
			<SplitPanel
				selectors={sessionRegistrationSelectors}
				actions={sessionRegistrationActions}
			>
				<Panel>
					<AppTable
						columns={tableColumns}
						headerHeight={50}
						estimatedRowHeight={50}
						defaultTablesConfig={defaultTablesConfig}
						selectors={sessionRegistrationSelectors}
						actions={sessionRegistrationActions}
					/>
				</Panel>
				<Panel className="details-panel">
					<RegistrationDetail />
				</Panel>
			</SplitPanel>
		</>
	);
}

export default SessionRegistrationTable;
