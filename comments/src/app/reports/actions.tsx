import { Row, Col, Button } from "react-bootstrap";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { refreshComments } from "@/store/comments";
import { selectIsOnline } from "@/store/offline";
import ProjectBallotSelector from "@/components/ProjectBallotSelector";

function ReportsActions({ onCopy }: { onCopy: () => void }) {
	const dispatch = useAppDispatch();
	const isOnline = useAppSelector(selectIsOnline);

	return (
		<Row className="w-100 justify-content-between align-items-center">
			<Col>
				<ProjectBallotSelector />
			</Col>
			<Col xs="auto" className="d-flex justify-content-end gap-2">
				<Button
					variant="outline-secondary"
					className="bi-copy"
					onClick={onCopy}
				/>
				<Button
					variant="outline-secondary"
					className="bi-arrow-repeat"
					title="Refresh"
					onClick={() => dispatch(refreshComments())}
					disabled={!isOnline}
				/>
			</Col>
		</Row>
	);
}

export default ReportsActions;
