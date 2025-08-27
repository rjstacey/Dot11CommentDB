import * as React from "react";
import { useParams, useNavigate, useSearchParams } from "react-router";

import { Col, Form, Spinner } from "react-bootstrap";
import { Select } from "@components/select";
import { displayDateRange } from "@components/lib";

import { useAppSelector } from "@/store/hooks";
import {
	selectSessionsState,
	selectRecentSessions,
	Session,
	displaySessionType,
} from "@/store/sessions";
import { selectSessionAttendeesState } from "@/store/sessionAttendees";

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

export function SessionSelector({
	value,
	onChange,
	readOnly,
	style,
}: {
	value: number | null;
	onChange: (value: number | null) => void;
	readOnly?: boolean;
	style?: React.CSSProperties;
}) {
	const { loading, valid } = useAppSelector(selectSessionsState);
	const options = useAppSelector(selectRecentSessions);
	const values = options.filter((o) => o.number === value);
	const handleChange = (values: typeof options) =>
		onChange(values.length > 0 ? values[0].number : null);

	return (
		<Select
			style={{ ...style, minWidth: 300 }}
			values={values}
			onChange={handleChange}
			options={options}
			loading={loading && !valid}
			clearable
			itemRenderer={renderSession}
			selectItemRenderer={renderSession}
			readOnly={readOnly}
			portal={document.querySelector("#root")}
			valueField="id"
			labelField="name"
		/>
	);
}

export function SessionSelectorNav({ style }: { style?: React.CSSProperties }) {
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

	const { loading } = useAppSelector(selectSessionAttendeesState);

	return (
		<Col
			xs="auto"
			className="d-flex align-items-center gap-3"
			style={style}
		>
			<Col xs="auto">
				<SessionSelector
					value={sessionNumber}
					onChange={setSessionNumber}
				/>
			</Col>
			<Col xs="auto" className="d-flex flex-column">
				<Form.Group
					controlId="useDaily"
					className="d-flex align-items-center gap-2"
				>
					<Form.Check
						checked={useDaily}
						onChange={toggleUseDaily}
						disabled={loading}
						label="Daily attendance"
					/>
				</Form.Group>
				<Form.Group
					controlId="not_useDaily"
					className="d-flex align-items-center gap-2"
				>
					<Form.Check
						checked={!useDaily}
						onChange={toggleUseDaily}
						disabled={loading}
						label="Attendance summary"
					/>
				</Form.Group>
			</Col>
			<Col>{loading && <Spinner animation="border" />}</Col>
		</Col>
	);
}
