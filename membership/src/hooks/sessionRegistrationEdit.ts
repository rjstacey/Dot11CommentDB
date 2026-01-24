import React from "react";
import isEqual from "lodash.isequal";
import { shallowDiff } from "@common";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
	selectSessionRegistrationState,
	selectSessionRegistrationSyncedEntities,
	selectSessionRegistrationSession,
	type SyncedSessionRegistration,
} from "@/store/sessionRegistration";
import {
	addAttendanceSummaries,
	updateAttendanceSummaries,
	type SessionAttendanceSummary,
	type SessionAttendanceSummaryCreate,
	type SessionAttendanceSummaryUpdate,
	type SessionAttendanceSummaryChange,
} from "@/store/attendanceSummaries";

/** Identify changes to attendance summary */
function sessionRegistrationAttendanceChanges(
	entity: SyncedSessionRegistration,
) {
	const changes: SessionAttendanceSummaryChange = {};
	const a = entity.attendance;
	if (a) {
		if (entity.IsRegistered !== a.IsRegistered)
			changes.IsRegistered = entity.IsRegistered;
		if (entity.InPerson !== a.InPerson) changes.InPerson = entity.InPerson;
		if (entity.DidAttend !== a.DidAttend)
			changes.DidAttend = entity.DidAttend;
		if (entity.DidNotAttend !== a.DidNotAttend)
			changes.DidNotAttend = entity.DidNotAttend;
		if (entity.Notes !== a.Notes) changes.Notes = entity.Notes;
	}
	return changes;
}

export type SessionRegistrationEditState =
	| {
			action: "updateOne";
			ids: number[];
			registration: SyncedSessionRegistration;
			attendanceEdit: SessionAttendanceSummary;
			attendanceSaved: SessionAttendanceSummary;
	  }
	| {
			action: "unmatched";
			ids: number[];
			registration: SyncedSessionRegistration;
	  }
	| {
			action: "updateMany";
			ids: number[];
			adds: SessionAttendanceSummaryCreate[];
			updates: SessionAttendanceSummaryUpdate[];
	  }
	| {
			action: null;
			ids: number[];
			message: string;
	  };

function useInitState(ids: number[]): SessionRegistrationEditState {
	const session = useAppSelector(selectSessionRegistrationSession);
	if (!session) throw new Error("No session for session registration");
	const { loading, valid } = useAppSelector(selectSessionRegistrationState);
	const syncedEntities = useAppSelector(
		selectSessionRegistrationSyncedEntities,
	);

	return React.useMemo(() => {
		if (loading && !valid) {
			return {
				action: null,
				ids,
				message: "Loading...",
			} satisfies SessionRegistrationEditState;
		} else if (ids.length === 0) {
			return {
				action: null,
				ids,
				message: "Nothing selected",
			} satisfies SessionRegistrationEditState;
		} else if (ids.length === 1) {
			const id = ids[0];
			const registration = syncedEntities[id];
			if (!registration) throw new Error("Invalid selection");
			const attendance = registration.attendance;
			if (attendance) {
				const changes =
					sessionRegistrationAttendanceChanges(registration);
				const attendanceEdit: SessionAttendanceSummary =
					Object.keys(changes).length > 0
						? { ...attendance, ...changes }
						: attendance;
				return {
					action: "updateOne",
					ids,
					registration,
					attendanceEdit,
					attendanceSaved: attendance,
				} satisfies SessionRegistrationEditState;
			}
			return {
				action: "unmatched",
				ids,
				registration,
			} satisfies SessionRegistrationEditState;
		} else {
			const updates: SessionAttendanceSummaryUpdate[] = [];
			const adds: SessionAttendanceSummaryCreate[] = [];
			for (const id of ids) {
				const registration = syncedEntities[id];
				if (!registration) throw new Error("Invalid selection");
				const attendance = registration.attendance;
				if (attendance) {
					const changes =
						sessionRegistrationAttendanceChanges(registration);
					const id = attendance.id;
					if (id) {
						if (Object.keys(changes).length > 0) {
							updates.push({ id, changes });
						}
					} else {
						adds.push({ ...attendance, ...changes });
					}
				}
			}
			return {
				action: "updateMany",
				ids,
				adds,
				updates,
			} satisfies SessionRegistrationEditState;
		}
	}, [loading, valid, ids, syncedEntities, session]);
}

export function useSessionRegistrationEdit(ids: number[], readOnly: boolean) {
	const dispatch = useAppDispatch();
	const initState = useInitState(ids);

	const [state, setState] =
		React.useState<SessionRegistrationEditState>(initState);

	React.useEffect(() => {
		setState(initState);
	}, [setState, initState]);

	const onChange = React.useCallback(
		(changes: SessionAttendanceSummaryChange) => {
			setState((state) => {
				if (!readOnly && state.action === "updateOne") {
					let attendanceEdit = {
						...state.attendanceEdit,
						...changes,
					};
					if (isEqual(attendanceEdit, state.attendanceSaved))
						attendanceEdit = state.attendanceSaved;
					return {
						...state,
						attendanceEdit,
					};
				}
				console.warn("onChange: bad state");
				return state;
			});
		},
		[readOnly, setState],
	);

	const hasChanges = React.useCallback(
		() =>
			(state.action === "updateOne" &&
				state.attendanceEdit !== state.attendanceSaved) ||
			(state.action === "updateMany" &&
				(state.adds.length > 0 || state.updates.length > 0)),
		[state],
	);

	const submit = React.useCallback(async () => {
		if (state.action === "updateOne") {
			const id = state.attendanceSaved.id;
			if (id) {
				const changes = shallowDiff(
					state.attendanceSaved,
					state.attendanceEdit,
				) as SessionAttendanceSummaryChange;
				if (Object.keys(changes).length > 0) {
					dispatch(updateAttendanceSummaries([{ id, changes }]));
					setState({
						...state,
						attendanceSaved: state.attendanceEdit,
					});
				}
			} else {
				dispatch(addAttendanceSummaries([state.attendanceEdit]));
			}
		} else if (state.action === "updateMany") {
			await Promise.all([
				dispatch(addAttendanceSummaries(state.adds)),
				dispatch(updateAttendanceSummaries(state.updates)),
			]);
		}
	}, [dispatch, setState, state]);

	const cancel = React.useCallback(() => {
		setState((state) => {
			const { action } = state;
			if (action === "updateOne") {
				return {
					...state,
					attendanceEdit: state.attendanceSaved,
				};
			}
			return state;
		});
	}, [setState]);

	return {
		state,
		submit,
		cancel,
		hasChanges,
		onChange,
	};
}
