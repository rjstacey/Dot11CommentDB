import { Row, Col, Button } from "react-bootstrap";
import { SplitTableButtonGroup } from "@common";
import { sessionsSelectors, sessionsActions } from "@/store/sessions";

import { tableColumns } from "./tableColumns";
import { refresh } from "./route";

function SessionsActions() {
	return (
		<Row className="w-100 m-3 justify-content-end">
			<SplitTableButtonGroup
				xs="auto"
				selectors={sessionsSelectors}
				actions={sessionsActions}
				columns={tableColumns}
			/>
			<Col
				xs="auto"
				className="d-flex justify-content-end align-items-center gap-2"
			>
				<Button
					variant="outline-primary"
					className="bi-arrow-repeat"
					title="Refresh"
					onClick={refresh}
				/>
			</Col>
		</Row>
	);
}

export default SessionsActions;
