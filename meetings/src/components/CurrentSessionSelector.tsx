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

export function CurrentSessionSelector({
	onChange,
	...otherProps
}: {
	onChange?: (sessionId: number | null) => void;
} & Omit<React.ComponentProps<typeof SessionSelector>, "value" | "onChange">) {
	const dispatch = useAppDispatch();
	const sessionId = useAppSelector(selectCurrentSessionId);

	const handleChange = (sessionId: number | null) => {
		dispatch(setCurrentSessionId(sessionId));
		onChange?.(sessionId);
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
	const dispatch = useAppDispatch();
	const showDateRange = useAppSelector(selectShowDateRange);
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
