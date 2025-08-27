import { Link } from "react-router";
import { Nav } from "react-bootstrap";
import { AppTable, ShowFilters } from "@components/table";
import {
	sessionRegistrationSelectors,
	sessionRegistrationActions,
	fields,
} from "@/store/sessionRegistration";
import { SplitTableButtonGroup } from "@components/table";
import { tableColumns, defaultTablesConfig } from "./tableColumns";

export function SessionRegistrationTable() {
	return (
		<>
			<Nav
				variant="underline"
				className="align-items-center"
				style={{ order: 2 }}
			>
				<Nav.Link as={Link} to="..">
					Attendance
				</Nav.Link>
				<Nav.Link as={Link} to="." active>
					Registration
				</Nav.Link>
			</Nav>
			<SplitTableButtonGroup
				style={{ order: 3 }}
				selectors={sessionRegistrationSelectors}
				actions={sessionRegistrationActions}
				columns={tableColumns}
			/>
			<div
				style={{
					order: 10,
					width: "100%",
					height: "100%",
					display: "flex",
					flexDirection: "column",
				}}
			>
				<ShowFilters
					fields={fields}
					selectors={sessionRegistrationSelectors}
					actions={sessionRegistrationActions}
				/>
				<AppTable
					columns={tableColumns}
					headerHeight={40}
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
