import { useState } from "react";
import { CommentEditDetail } from "./edit";
import { CommentHistoryDetail } from "./history";
import { useAppSelector } from "@/store/hooks";
import { selectIsOnline } from "@/store/offline";

import "./details.css";

export function CommentsDetail() {
	const [showHistory, setShowHistory] = useState(false);

	if (showHistory)
		return <CommentHistoryDetail showHistory={showHistory} setShowHistory={setShowHistory} />;
	else
		return <CommentEditDetail showHistory={showHistory} setShowHistory={setShowHistory} />;
}
