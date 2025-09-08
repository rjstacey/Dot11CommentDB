import { useNavigate, useParams } from "react-router";
import { Button, Row, Col } from "react-bootstrap";

import { SplitTableButtonGroup } from "@common";

import { useAppSelector } from "@/store/hooks";
import { AccessLevel } from "@/store/user";
import {
	selectBallotsState,
	selectBallotsAccess,
	ballotsSelectors,
	ballotsActions,
} from "@/store/ballots";

import { BallotsSubmenu } from "./submenu";
import { tableColumns } from "./tableColumns";
import { refresh } from "./loader";

export function BallotActions() {
	const navigate = useNavigate();
	const { groupName } = useParams();

	const access = useAppSelector(selectBallotsAccess);
	const { loading } = useAppSelector(selectBallotsState);

	const showEpolls = () => navigate(`/${groupName}/epolls/`);

	return (
		<Row className="w-100 d-flex justify-content-end align-items-center m-2">
			<SplitTableButtonGroup
				selectors={ballotsSelectors}
				actions={ballotsActions}
				columns={tableColumns}
			/>
			<BallotsSubmenu />
			<Col xs="auto" className="d-flex justify-content-end gap-2">
				{access >= AccessLevel.admin && (
					<Button
						className="bi-cloud-upload"
						name="import"
						title="Import ePoll"
						onClick={showEpolls}
					/>
				)}
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
