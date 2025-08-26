import { Row, Col } from "react-bootstrap";
import {
	AppTable,
	SplitPanel,
	Panel,
	ShowFilters,
	GlobalFilter,
} from "@components/table";

import {
	sessionAttendeesSelectors,
	sessionAttendeesActions,
	fields,
} from "@/store/sessionAttendees";

import { MemberAttendanceDetail } from "./detail";
import { tableColumns, defaultTablesConfig } from "./tableColumns";

export function SessionAttendanceTable() {
	return (
		<>
			<Row className="align-items-center w-100">
				<Col>
					<ShowFilters
						selectors={sessionAttendeesSelectors}
						actions={sessionAttendeesActions}
						fields={fields}
					/>
				</Col>
				<Col xs={3} sm={2}>
					<GlobalFilter
						selectors={sessionAttendeesSelectors}
						actions={sessionAttendeesActions}
					/>
				</Col>
			</Row>
			<SplitPanel
				selectors={sessionAttendeesSelectors}
				actions={sessionAttendeesActions}
			>
				<Panel>
					<AppTable
						columns={tableColumns}
						headerHeight={40}
						estimatedRowHeight={50}
						defaultTablesConfig={defaultTablesConfig}
						selectors={sessionAttendeesSelectors}
						actions={sessionAttendeesActions}
					/>
				</Panel>
				<Panel className="details-panel">
					<MemberAttendanceDetail />
				</Panel>
			</SplitPanel>
		</>
	);
}

export default SessionAttendanceTable;
