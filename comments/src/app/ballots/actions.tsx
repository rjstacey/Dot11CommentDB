import { Button, Row, Col } from "react-bootstrap";

import { SplitTableButtonGroup } from "@common";

import { useAppSelector } from "@/store/hooks";
import {
	selectBallotsState,
	ballotsSelectors,
	ballotsActions,
} from "@/store/ballots";

import { BallotsSubmenu } from "./submenu";
import { tableColumns } from "./tableColumns";
import { refresh } from "./loader";

export function BallotActions() {
	const { loading } = useAppSelector(selectBallotsState);

	return (
		<Row className="w-100 d-flex justify-content-end align-items-center m-2">
			<BallotsSubmenu />
			<SplitTableButtonGroup
				selectors={ballotsSelectors}
				actions={ballotsActions}
				columns={tableColumns}
			/>
			<Col xs="auto" className="d-flex justify-content-end gap-2">
				<Button
					variant="outline-primary"
					className="bi-arrow-repeat"
					title="Refresh"
					onClick={refresh}
					disabled={loading}
				/>
			</Col>
		</Row>
	);
}
