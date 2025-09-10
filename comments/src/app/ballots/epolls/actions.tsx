import { Spinner, Button, Row, Col } from "react-bootstrap";
import { SplitTableButtonGroup } from "@common";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectIsOnline } from "@/store/offline";
import {
	loadMoreEpolls,
	refreshEpolls,
	selectEpollsState,
	epollsSelectors,
	epollsActions,
} from "@/store/epolls";

import { BallotsSubmenu } from "../submenu";
import { tableColumns } from "./tableColumns";

function EpollsActions() {
	const dispatch = useAppDispatch();
	const { loading } = useAppSelector(selectEpollsState);
	const isOnline = useAppSelector(selectIsOnline);

	return (
		<Row className="w-100 d-flex align-items-center m-2">
			<BallotsSubmenu xs="auto" />
			<SplitTableButtonGroup
				selectors={epollsSelectors}
				actions={epollsActions}
				columns={tableColumns}
				xs="auto"
			/>
			<Col xs="auto">
				<Spinner
					style={{ visibility: loading ? "visible" : "hidden" }}
				/>
			</Col>
			<Col className="d-flex justify-content-end gap-2">
				<Button
					variant="outline-secondary"
					className="bi-chevron-double-down"
					title="Load More"
					onClick={() => dispatch(loadMoreEpolls())}
					disabled={loading || !isOnline}
				/>
				<Button
					variant="outline-secondary"
					className="bi-arrow-repeat"
					name="refresh"
					title="Refresh"
					onClick={() => dispatch(refreshEpolls())}
					disabled={loading || !isOnline}
				/>
			</Col>
		</Row>
	);
}

export default EpollsActions;
