import { Row, Col } from "react-bootstrap";
import {
	AppTable,
	ShowFilters,
	GlobalFilter,
	SplitTableButtonGroup,
} from "@common";
import {
	sessionRegistrationSelectors,
	sessionRegistrationActions,
	fields,
} from "@/store/sessionRegistration";
import { tableColumns, defaultTablesConfig } from "./tableColumns";
import { Main } from "../main";

export function SessionRegistrationTable() {
	return (
		<>
			<SplitTableButtonGroup
				style={{ order: 3 }}
				selectors={sessionRegistrationSelectors}
				actions={sessionRegistrationActions}
				columns={tableColumns}
			/>
			<Main>
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
				<AppTable
					columns={tableColumns}
					headerHeight={40}
					estimatedRowHeight={50}
					defaultTablesConfig={defaultTablesConfig}
					selectors={sessionRegistrationSelectors}
					actions={sessionRegistrationActions}
				/>
			</Main>
		</>
	);
}

export default SessionRegistrationTable;
