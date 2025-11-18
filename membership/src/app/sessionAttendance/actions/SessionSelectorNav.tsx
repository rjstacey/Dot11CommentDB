import * as React from "react";
import { useParams, useNavigate, useSearchParams } from "react-router";

import { Form, Spinner } from "react-bootstrap";
import { Select } from "@common";
import { displayDateRange } from "@common";

import { useAppSelector } from "@/store/hooks";
import {
	selectSessionsState,
	selectRecentPlusOneSessions,
	Session,
	displaySessionType,
} from "@/store/sessions";
import { selectImatAttendanceSummaryState } from "@/store/imatAttendanceSummary";

import styles from "./actions.module.css";

const renderSession = ({ item: session }: { item: Session }) => (
	<div className={styles.sessionItem}>
		<span>
			{session.number +
				" " +
				displaySessionType(session.type) +
				", " +
				displayDateRange(session.startDate, session.endDate)}
		</span>
		<span>{session.name}</span>
	</div>
);

function SessionSelector({
	value,
	onChange,
	readOnly,
	style,
	className,
}: {
	value: number | null;
	onChange: (value: number | null) => void;
	readOnly?: boolean;
	style?: React.CSSProperties;
	className?: string;
}) {
	const { loading, valid } = useAppSelector(selectSessionsState);
	const options = useAppSelector(selectRecentPlusOneSessions);
	const values = options.filter((o) => o.number === value);
	const handleChange = (values: typeof options) =>
		onChange(values.length > 0 ? values[0].number : null);

	return (
		<Select
			style={style}
			className={className}
			values={values}
			onChange={handleChange}
			options={options}
			loading={loading && !valid}
			clearable
			itemRenderer={renderSession}
			selectItemRenderer={renderSession}
			readOnly={readOnly}
			valueField="id"
			labelField="name"
		/>
	);
}

export function SessionSelectorNav(props: React.ComponentProps<"div">) {
	const navigate = useNavigate();
	const params = useParams();
	const [searchParams] = useSearchParams();
	const useDaily =
		searchParams.has("useDaily") &&
		searchParams.get("useDaily") !== "false";

	const sessionNumber = Number(params.sessionNumber);
	const setSessionNumber = (sessionNumber: number | null) => {
		let pathname = "";
		if (sessionNumber) pathname += sessionNumber;
		navigate({ pathname, search: searchParams.toString() });
	};

	const toggleUseDaily = () => {
		if (useDaily) searchParams.delete("useDaily");
		else searchParams.append("useDaily", "true");
		navigate({ search: searchParams.toString() });
	};

	const { loading } = useAppSelector(selectImatAttendanceSummaryState);

	return (
		<div className="d-flex align-items-center gap-3 me-3" {...props}>
			<SessionSelector
				style={{ width: 400 }}
				value={sessionNumber}
				onChange={setSessionNumber}
			/>
			<div className="d-flex flex-column" style={{ width: 200 }}>
				<Form.Check
					id="useDaily"
					checked={useDaily}
					onChange={toggleUseDaily}
					disabled={loading}
					label="Daily attendance"
				/>
				<Form.Check
					id="not_useDaily"
					checked={!useDaily}
					onChange={toggleUseDaily}
					disabled={loading}
					label="Attendance summary"
				/>
			</div>
			<Spinner hidden={!loading} />
		</div>
	);
}
