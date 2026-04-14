import { useCallback, useEffect, useReducer } from "react";
import isEqual from "lodash.isequal";
import { shallowDiff } from "@common";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
	selectSessionRegistrationState,
	selectSessionRegistrationSyncedEntities,
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

export type SessionRegistrationEditState = (
	| {
			action: "updateOne";
			registration: SyncedSessionRegistration;
			attendanceEdit: SessionAttendanceSummary;
			attendanceSaved: SessionAttendanceSummary;
	  }
	| {
			action: "updateMany";
			adds: SessionAttendanceSummaryCreate[];
			updates: SessionAttendanceSummaryUpdate[];
	  }
	| {
			action: "unmatched";
			registration: SyncedSessionRegistration;
	  }
	| {
			action: null;
			message: string;
	  }
) & { ids: number[] };

type SessionRegistrationEditAction =
	| {
			type: "INIT" | "SUBMIT" | "CANCEL";
	  }
	| {
			type: "CHANGE";
			changes: SessionAttendanceSummaryChange;
	  };
const INIT = { type: "INIT" } as const;
const SUBMIT = { type: "SUBMIT" } as const;
const CANCEL = { type: "CANCEL" } as const;
const CHANGE = (changes: SessionAttendanceSummaryChange) =>
	({ type: "CHANGE", changes }) as const;

function useSessionRegistrationEditReducer(ids: number[]) {
	const { loading, valid } = useAppSelector(selectSessionRegistrationState);
	const entities = useAppSelector(selectSessionRegistrationSyncedEntities);

	const initState = useCallback((): SessionRegistrationEditState => {
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
			const registration = entities[id];
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
				const registration = entities[id];
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
	}, [loading, valid, ids, entities]);

	const reducer = useCallback(
		(
			state: SessionRegistrationEditState,
			action: SessionRegistrationEditAction,
		): SessionRegistrationEditState => {
			if (action.type === "INIT") {
				return initState();
			}
			if (action.type === "CHANGE") {
				if (state.action === "updateOne") {
					let attendanceEdit = {
						...state.attendanceEdit,
						...action.changes,
					};
					if (isEqual(attendanceEdit, state.attendanceSaved))
						attendanceEdit = state.attendanceSaved;
					return {
						...state,
						attendanceEdit,
					};
				}
				return state;
			}
			if (action.type === "SUBMIT") {
				if (state.action === "updateOne") {
					return {
						...state,
						attendanceSaved: state.attendanceEdit,
					};
				}
				return state;
			}
			if (action.type === "CANCEL") {
				if (state.action === "updateOne") {
					return {
						...state,
						attendanceEdit: state.attendanceSaved,
					};
				}
				return state;
			}
			throw new Error("Unknown action: " + action);
		},
		[initState],
	);

	return useReducer(reducer, undefined, initState);
}

export function useSessionRegistrationEdit(ids: number[], readOnly: boolean) {
	const dispatch = useAppDispatch();
	const [state, dispatchStateAction] = useSessionRegistrationEditReducer(ids);

	useEffect(() => {
		dispatchStateAction(INIT);
	}, [ids]);

	const onChange = useCallback(
		(changes: SessionAttendanceSummaryChange) => {
			if (readOnly || state.action !== "updateOne") {
				console.warn("onChange: readOnly or bad state");
				return;
			}
			dispatchStateAction(CHANGE(changes));
		},
		[readOnly, state.action],
	);

	const hasChanges = useCallback(
		() =>
			(state.action === "updateOne" &&
				state.attendanceEdit !== state.attendanceSaved) ||
			(state.action === "updateMany" &&
				(state.adds.length > 0 || state.updates.length > 0)),
		[state],
	);

	const submit = useCallback(async () => {
		if (readOnly) {
			console.warn("submit: readOnly");
			return;
		}
		if (state.action === "updateOne") {
			const id = state.attendanceSaved.id;
			if (id) {
				const changes = shallowDiff(
					state.attendanceSaved,
					state.attendanceEdit,
				) as SessionAttendanceSummaryChange;
				if (Object.keys(changes).length > 0) {
					await dispatch(
						updateAttendanceSummaries([{ id, changes }]),
					);
				}
			} else {
				await dispatch(addAttendanceSummaries([state.attendanceEdit]));
			}
			dispatchStateAction(SUBMIT);
		} else if (state.action === "updateMany") {
			await Promise.all([
				dispatch(addAttendanceSummaries(state.adds)),
				dispatch(updateAttendanceSummaries(state.updates)),
			]);
			dispatchStateAction(INIT);
		} else {
			console.warn("submit: bad state");
		}
	}, [readOnly, state]);

	const cancel = useCallback(() => {
		dispatchStateAction(CANCEL);
	}, []);

	return {
		state,
		submit,
		cancel,
		hasChanges,
		onChange,
	};
}
