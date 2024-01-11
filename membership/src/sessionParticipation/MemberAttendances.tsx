import React from "react";
import { connect, ConnectedProps } from "react-redux";
import type { Dictionary } from "@reduxjs/toolkit";

import {
	Col,
	Checkbox,
	Input,
	displayDateRange,
	debounce,
	shallowDiff,
} from "dot11-components";

import type { RootState } from "../store";
import {
	selectAttendancesEntities,
	selectMemberAttendanceStats,
	selectAttendanceSessionIds,
	updateAttendances,
	type SessionAttendanceSummary,
} from "../store/sessionParticipation";
import {
	selectSessionEntities,
	type Session,
} from "../store/sessions";

import styles from "../sessionAttendance/sessionAttendance.module.css";

import { EditTable as Table, TableColumn } from "../components/Table";

const attendancesColumns: TableColumn[] = [
	{ key: "Session", label: "Session" },
	{
		key: "AttendancePercentage",
		label: "Attendance",
		styleCell: { justifyContent: "flex-end" },
	},
	{
		key: "DidAttend",
		label: "Did attend",
		styleCell: { justifyContent: "center" },
	},
	{
		key: "DidNotAttend",
		label: "Did not attend",
		styleCell: { justifyContent: "center" },
	},
	{ key: "Notes", label: "Notes" },
	{
		key: "SAPIN",
		label: "SA PIN",
		styleCell: { justifyContent: "flex-end" },
	},
];

type MemberAttendancesProps = {
	SAPIN: number; //Member;
	readOnly?: boolean;
};

type MemberAttendancesInternalProps = MemberAttendancesProps &
	ConnectedMemberAttendancesProps;

type MemberAttendanceState = {
	sessionIds: number[];
	edited: Record<number, SessionAttendanceSummary>;
	saved: Record<number, SessionAttendanceSummary>;
	SAPIN: number;
	sessionEntities: Dictionary<Session>;
	readOnly: boolean;
};

class MemberAttendances extends React.Component<
	MemberAttendancesInternalProps,
	MemberAttendanceState
> {
	constructor(props: MemberAttendancesInternalProps) {
		super(props);
		this.state = {
			...this.initState(props),
			sessionEntities: props.sessionEntities,
			readOnly: !!props.readOnly,
		};
		this.triggerSave = debounce(this.save, 500);
		this.columns = this.generateColumns(props);
	}

	triggerSave: ReturnType<typeof debounce>;
	columns: TableColumn[];

	componentWillUnmount() {
		this.triggerSave.flush();
	}

	componentDidUpdate() {
		const { sessionEntities, readOnly } = this.props;
		const { state } = this;
		if (
			state.sessionEntities !== sessionEntities ||
			state.readOnly !== !!readOnly
		) {
			this.columns = this.generateColumns(this.props);
			this.setState({ sessionEntities, readOnly: !!readOnly });
		}
	}

	initState = (props: MemberAttendancesInternalProps) => {
		const { sessionIds, attendancesEntities, SAPIN } = props;
		const attendances: Record<number, SessionAttendanceSummary> = {};

		sessionIds.forEach((session_id) => {
			const sessionAttendances =
				attendancesEntities[SAPIN]?.sessionAttendanceSummaries || [];
			let a = sessionAttendances.find((a) => a.session_id === session_id);
			if (!a) {
				// No entry for this session; generate a "null" entry
				a = {
					id: 0,
					session_id,
					AttendancePercentage: 0,
					DidAttend: false,
					DidNotAttend: false,
					Notes: "",
					SAPIN,
				};
			}
			attendances[session_id] = a;
		});
		return {
			SAPIN,
			sessionIds,
			edited: attendances,
			saved: attendances,
		};
	};

	save = () => {
		const { SAPIN, sessionIds, edited, saved } = this.state;
		const updates = [];
		for (let session_id of sessionIds) {
			const changes = shallowDiff(
				saved[session_id],
				edited[session_id]
			) as Partial<SessionAttendanceSummary>;
			if (Object.keys(changes).length > 0)
				updates.push({ session_id, changes });
		}
		if (updates.length > 0) this.props.updateAttendances(SAPIN, updates);
		this.setState((state) => ({ ...state, saved: edited }));
	};

	update = (
		session_id: number,
		changes: Partial<SessionAttendanceSummary>
	) => {
		console.log(session_id, changes);
		this.setState(
			{
				edited: {
					...this.state.edited,
					[session_id]: {
						...this.state.edited[session_id],
						...changes,
					},
				},
			},
			this.triggerSave
		);
	};

	generateColumns(props: MemberAttendancesInternalProps) {
		const { SAPIN, sessionEntities, readOnly } = props;

		function renderSessionSummary(id: number) {
			const session = sessionEntities[id];
			if (!session)
				return "Unknown";
			return (
				<div className={styles.sessionItem}>
					<span>
						{session.number}{" "}
						{session.type === "p" ? "Plenary: " : "Interim: "}{" "}
						{displayDateRange(session.startDate, session.endDate)}
					</span>
					<span>{session.name}</span>
				</div>
			)
		}

		return attendancesColumns.map((col) => {
			let renderCell:
				| ((
						entry: SessionAttendanceSummary
				  ) => JSX.Element | string | number)
				| undefined;
			if (col.key === "Session")
				renderCell = (entry) => renderSessionSummary(entry.session_id);
			if (col.key === "AttendancePercentage")
				renderCell = (entry) =>
					`${entry.AttendancePercentage.toFixed(0)}%`;
			if (col.key === "DidAttend") {
				renderCell = (entry) => (
					<Checkbox
						checked={!!entry.DidAttend}
						onChange={(e) =>
							this.update(entry.session_id, {
								DidAttend: e.target.checked,
							})
						}
						disabled={readOnly}
					/>
				);
			}
			if (col.key === "DidNotAttend") {
				renderCell = (entry) => (
					<Checkbox
						checked={!!entry.DidNotAttend}
						onChange={(e) =>
							this.update(entry.session_id, {
								DidNotAttend: e.target.checked,
							})
						}
						disabled={readOnly}
					/>
				);
			}
			if (col.key === "Notes") {
				renderCell = (entry) => (
					<Input
						type="text"
						value={entry.Notes || ""}
						onChange={(e) =>
							this.update(entry.session_id, {
								Notes: e.target.value,
							})
						}
						disabled={readOnly}
					/>
				);
			}
			if (col.key === "SAPIN") {
				renderCell = (entry) =>
					entry.SAPIN !== SAPIN ? entry.SAPIN : "";
			}

			if (renderCell) return { ...col, renderCell };

			return col;
		});
	}

	render() {
		const { count, total } = this.props;
		const { sessionIds, edited } = this.state;
		const values = sessionIds.map((session_id) => edited[session_id]);
		return (
			<Col>
				<label>{`Recent session attendance: ${count}/${total}`}</label>
				<Table columns={this.columns} values={values} />
			</Col>
		);
	}
}

const connector = connect(
	(state: RootState, props: MemberAttendancesProps) => {
		const { count, total } = selectMemberAttendanceStats(
			state,
			props.SAPIN
		);
		const sessionIds = (selectAttendanceSessionIds(state) as number[])
			.slice()
			.reverse();
		return {
			sessionIds,
			sessionEntities: selectSessionEntities(state),
			attendancesEntities: selectAttendancesEntities(state),
			count,
			total,
		};
	},
	{ updateAttendances }
);

type ConnectedMemberAttendancesProps = ConnectedProps<typeof connector>;

const ConnectedMemberAttendances = connector(MemberAttendances);

export default ConnectedMemberAttendances;
