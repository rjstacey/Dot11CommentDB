import { ActionButton } from "dot11-components";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { refreshComments } from "@/store/comments";
import { selectIsOnline } from "@/store/offline";

function ReportsActions() {
	const dispatch = useAppDispatch();
	const isOnline = useAppSelector(selectIsOnline);

	return (
		<ActionButton
			name="refresh"
			title="Refresh"
			onClick={() => dispatch(refreshComments())}
			disabled={!isOnline}
		/>
	);
}

export default ReportsActions;
