import { useNavigate } from "react-router";
import { ActionButton } from "dot11-components";

function ReportsActions() {
	const navigate = useNavigate();
	const refresh = () => navigate(".", { replace: true });
	return <ActionButton name="refresh" title="Refresh" onClick={refresh} />;
}

export default ReportsActions;
