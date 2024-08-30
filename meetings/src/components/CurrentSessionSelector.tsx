import * as React from "react";

import { Checkbox } from "dot11-components";

import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
	selectCurrentSessionId,
	setCurrentSessionId,
	selectShowDateRange,
	setShowDateRange,
} from "../store/current";

import SessionSelector from "./SessionSelector";
import { useLocation, useNavigate } from "react-router-dom";
import { selectSessionEntities } from "../store/sessions";

export function CurrentSessionSelector({
	onChange,
	...otherProps
}: {
	onChange?: (sessionId: number | null) => void;
} & Omit<React.ComponentProps<typeof SessionSelector>, "value" | "onChange">) {
	const navigate = useNavigate();
	const location = useLocation();
	const dispatch = useAppDispatch();
	const sessionId = useAppSelector(selectCurrentSessionId);
	const sessionEntities = useAppSelector(selectSessionEntities);

	const handleChange = (sessionId: number | null) => {
		dispatch(setCurrentSessionId(sessionId));
		onChange?.(sessionId);
		const s = new URLSearchParams(location.search);
		s.delete("sessionNumber");
		if (sessionId) {
			const session = sessionEntities[sessionId];
			if (session && session.number)
				s.set("sessionNumber", session.number.toString());
		}
		navigate({ search: s.toString() });
	};

	return (
		<SessionSelector
			value={sessionId}
			onChange={handleChange}
			{...otherProps}
		/>
	);
}

function LabeledCurrentSessionSelector({
	allowShowDateRange,
	...props
}: {
	allowShowDateRange?: boolean;
} & React.ComponentProps<typeof CurrentSessionSelector>) {
	const navigate = useNavigate();
	const location = useLocation();
	const dispatch = useAppDispatch();
	const showDateRange = useAppSelector(selectShowDateRange);

	const handleShowDateRange = (show: boolean) => {
		const s = new URLSearchParams(location.search);
		s.delete("showDateRange");
		if (showDateRange) s.set("showDateRange", "1");
		navigate({ search: s.toString() });
	};

	return (
		<div style={{ display: "flex", alignItems: "center" }}>
			<label style={{ marginRight: 10, fontWeight: "bold" }}>
				Session:
			</label>
			<CurrentSessionSelector {...props} />
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
					<label>Show date range</label>
					<Checkbox
						checked={showDateRange}
						onChange={() =>
							dispatch(setShowDateRange(!showDateRange))
						}
					/>
				</div>
			)}
		</div>
	);
}

export default LabeledCurrentSessionSelector;
