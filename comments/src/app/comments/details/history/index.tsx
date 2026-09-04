import CommentHistory from "./CommentHistory";
import { ShowHistoryButton } from "../ShowHistoryButton";

export function CommentHistoryDetail({
	showHistory,
	setShowHistory,
}: {
	showHistory: boolean;
	setShowHistory: (show: boolean) => void;
}) {
	return (
		<div className="main">
			<div className="d-flex justify-content-end">
				<ShowHistoryButton
					showHistory={showHistory}
					setShowHistory={setShowHistory}
				/>
			</div>
			<CommentHistory />
		</div>
	);
}
