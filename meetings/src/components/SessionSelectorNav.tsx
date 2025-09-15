import { useParams, useLocation, useNavigate } from "react-router";

import { FormCheck } from "react-bootstrap";

import { useAppSelector } from "@/store/hooks";
import { selectSessionIds, selectSessionEntities } from "@/store/sessions";

import SessionSelector from "./SessionSelector";

function LabeledCurrentSessionSelector({
	allowShowDateRange,
}: {
	allowShowDateRange?: boolean;
}) {
	const navigate = useNavigate();
	const { search } = useLocation();
	const params = useParams();
	const sessionIds = useAppSelector(selectSessionIds);
	const sessionEntities = useAppSelector(selectSessionEntities);

	const s = new URLSearchParams(search);
	const showDateRange = Boolean(s.get("showDateRange"));
	const sessionNumber =
		"sessionNumber" in params ? Number(params.sessionNumber) : null;
	const sessionId =
		(sessionIds.find(
			(id) => sessionEntities[id]!.number === sessionNumber
		) as number) || null;

	function toggleShowDateRange() {
		if (showDateRange) s.delete("showDateRange");
		else s.set("showDateRange", "1");
		navigate({ search: s.toString() });
	}

	function setSessionId(sessionId: number | null) {
		let pathname = "";
		const session = sessionId ? sessionEntities[sessionId] : undefined;
		if (session) pathname += session.number;
		navigate({ pathname, search });
	}

	return (
		<div style={{ display: "flex", alignItems: "center" }}>
			<label style={{ marginRight: 10, fontWeight: "bold" }}>
				Session:
			</label>
			<SessionSelector value={sessionId} onChange={setSessionId} />
			{allowShowDateRange && (
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						justifyContent: "center",
						alignItems: "center",
						marginLeft: 10,
					}}
				>
					<FormCheck
						id="show-date-range"
						checked={showDateRange}
						onChange={toggleShowDateRange}
						label="Show date range"
						reverse
					/>
				</div>
			)}
		</div>
	);
}

export default LabeledCurrentSessionSelector;
