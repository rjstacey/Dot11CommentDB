import { useParams, useLocation, useNavigate } from "react-router";
import { FormCheck, FormLabel, Row, Col } from "react-bootstrap";

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
		<>
			<Row
				className="d-flex align-items-center flex-nowrap"
				style={{ maxWidth: 500 }}
			>
				<Col>
					<SessionSelector
						value={sessionId}
						onChange={setSessionId}
					/>
				</Col>
				{allowShowDateRange && (
					<Col
						xs="auto"
						className="d-flex flex-column align-items-center"
					>
						<FormLabel htmlFor="show-date-range">
							Show date range
						</FormLabel>
						<FormCheck
							id="show-date-range"
							checked={showDateRange}
							onChange={toggleShowDateRange}
						/>
					</Col>
				)}
			</Row>
		</>
	);
}

export default LabeledCurrentSessionSelector;
