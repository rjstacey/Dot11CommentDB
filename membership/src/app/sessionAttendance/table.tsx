import { Link } from "react-router";
import { Row, Col, Nav } from "react-bootstrap";
import {
	AppTable,
	SplitPanel,
	Panel,
	ShowFilters,
	GlobalFilter,
} from "@components/table";

import { SplitTableButtonGroup } from "@components/table";

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
			<Nav
				variant="underline"
				className="align-items-center"
				style={{ order: 2 }}
			>
				<Nav.Link as={Link} to="." active>
					Attendance
				</Nav.Link>
				<Nav.Link as={Link} to="registration">
					Registration
				</Nav.Link>
			</Nav>
			<SplitTableButtonGroup
				style={{ order: 3 }}
				selectors={sessionAttendeesSelectors}
				actions={sessionAttendeesActions}
				columns={tableColumns}
			/>
			<div
				style={{
					order: 10,
					display: "flex",
					flexDirection: "column",
					width: "100%",
					height: "100%",
				}}
			>
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
			</div>
		</>
	);
}

export default SessionAttendanceTable;
