import { useLocation, useNavigate } from "react-router";

import { Checkbox } from "dot11-components";

import { useAppSelector } from "@/store/hooks";
import { selectSessionIds, selectSessionEntities } from "@/store/sessions";

import SessionSelector from "./SessionSelector";

function LabeledCurrentSessionSelector({
	allowShowDateRange,
}: {
	allowShowDateRange?: boolean;
}) {
	const navigate = useNavigate();
	const location = useLocation();
	const sessionIds = useAppSelector(selectSessionIds);
	const sessionEntities = useAppSelector(selectSessionEntities);

	const s = new URLSearchParams(location.search);
	const showDateRange = Boolean(s.get("showDateRange"));
	const sessionNumber = Number(s.get("sessionNumber"));
	const sessionId =
		Number(
			sessionIds.find(
				(id) => sessionEntities[id]!.number === sessionNumber
			)
		) || null;

	function toggleShowDateRange() {
		if (showDateRange) s.delete("showDateRange");
		else s.set("showDateRange", "1");
		navigate({ search: s.toString() });
	}

	function setSessionId(sessionId: number | null) {
		s.delete("sessionNumber");
		if (sessionId) {
			const session = sessionEntities[sessionId];
			if (session && session.number)
				s.set("sessionNumber", session.number.toString());
		}
		navigate({ search: s.toString() });
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
					<label htmlFor="show-date-range">Show date range</label>
					<Checkbox
						id="show-date-range"
						checked={showDateRange}
						onChange={toggleShowDateRange}
					/>
				</div>
			)}
		</div>
	);
}

export default LabeledCurrentSessionSelector;
