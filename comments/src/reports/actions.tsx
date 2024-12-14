import { ActionButton } from "dot11-components";
import { useAppDispatch, useAppSelector } from "src/store/hooks";
import { refreshComments } from "src/store/comments";
import { selectIsOnline } from "src/store/offline";

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
