import { useState } from "react";
import { Button } from "react-bootstrap";
import { CommentEditDetail } from "./edit";
import { CommentHistoryDetail } from "./history";
import { useAppSelector } from "@/store/hooks";
import { selectIsOnline } from "@/store/offline";

import "./details.css";

export function CommentsDetail() {
	const isOnline = useAppSelector(selectIsOnline);
	const [showHistory, setShowHistory] = useState(false);

	const contentButton = (
		<Button
			id="toggle-detail-history"
			variant="outline-warning"
			value="history"
			onClick={() => setShowHistory(!showHistory)}
			active={showHistory}
			disabled={!isOnline}
		>
			<i className="bi-clock-history me-1" />
			{"History"}
		</Button>
	);

	return (
		<>
			<div className="d-flex justify-content-end gap-2 mb-2">
				{contentButton}
			</div>
			{showHistory ? <CommentHistoryDetail /> : <CommentEditDetail />}
		</>
	);
}
