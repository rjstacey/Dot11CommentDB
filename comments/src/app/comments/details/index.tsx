import { useState } from "react";
import {
	ToggleButton,
	ButtonGroup,
} from "react-bootstrap";
import { CommentEditDetail } from "./edit";
import { CommentHistoryDetail } from "./history";

import { useAppSelector } from "@/store/hooks";
import { selectIsOnline } from "@/store/offline";

import "./details.css";

type DetailState = "comment" | "history" | "draft";

export function CommentsDetail() {
	const isOnline = useAppSelector(selectIsOnline);
	const [detail, setDetail] = useState<DetailState>("comment");

	const contentButton = (
		<ButtonGroup>
			<ToggleButton
				id="toggle-detail-edit"
				variant="outline-success"
				type="radio"
				value="comment"
				onChange={(e) => setDetail(e.currentTarget.value as DetailState)}
				checked={detail === "comment"}
				disabled={!isOnline}
			>
				<i className="bi-list-columns me-1" />
				{"Comment"}
			</ToggleButton>
			<ToggleButton
				id="toggle-detail-history"
				variant="outline-warning"
				type="radio"
				value="history"
				onChange={(e) => setDetail(e.currentTarget.value as DetailState)}
				checked={detail === "history"}
				disabled={!isOnline}
			>
				<i className="bi-clock-history me-1" />
				{"History"}
			</ToggleButton>
			<ToggleButton
				id="toggle-detail-draft"
				variant="outline-info"
				type="radio"
				value="draft"
				onChange={(e) => setDetail(e.currentTarget.value as DetailState)}
				checked={detail === "draft"}
				disabled={!isOnline}
			>
				<i className="bi-file-pdf me-1" />
				{"Draft"}
			</ToggleButton>
		</ButtonGroup>
	);

	if (detail === "comment") {
		return <CommentEditDetail contentButton={contentButton} />;
	} else if (detail === "history") {
		return <CommentHistoryDetail contentButton={contentButton} />;
	} else if (detail === "draft") {
		return <div>Draft content goes here</div>;
	}
	return null;
}
