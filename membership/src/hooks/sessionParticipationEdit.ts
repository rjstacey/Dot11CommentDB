import { useEffect, useCallback, useMemo, useReducer } from "react";
import { shallowDiff } from "@common";
import isEqual from "lodash.isequal";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectSessionParticipationSessionIds } from "@/store/sessionParticipation";
import {
	selectMemberAttendances,
	updateAttendanceSummaries,
	addAttendanceSummaries,
	deleteAttendanceSummaries,
	getNullAttendanceSummary,
	isNullAttendanceSummary,
	type MemberSessionAttendanceSummaries,
	type SessionAttendanceSummaryCreate,
	type SessionAttendanceSummaryUpdate,
	type SessionAttendanceSummaryChange,
} from "@/store/attendanceSummaries";

function useSessionAttendances(SAPIN: number) {
	const sessionIds = useAppSelector(selectSessionParticipationSessionIds);
	const membersAttendances = useAppSelector(selectMemberAttendances);

	return useMemo(() => {
		const session_ids = sessionIds as number[];
		const attendances = { ...membersAttendances[SAPIN] };

		for (const session_id of session_ids) {
			if (!attendances[session_id]) {
				attendances[session_id] = getNullAttendanceSummary(
					session_id,
					SAPIN,
				);
			}
		}

		return {
			session_ids,
			attendances,
		};
	}, [SAPIN, sessionIds, membersAttendances]);
}

export type SessionParticipationEditState = {
	session_ids: number[];
	edited: MemberSessionAttendanceSummaries;
	saved: MemberSessionAttendanceSummaries;
};
type SessionParticipationEditAction =
	| {
			type: "INIT";
	  }
	| {
			type: "CHANGE";
			session_id: number;
			changes: SessionAttendanceSummaryChange;
	  }
	| {
			type: "SUBMIT";
	  };
const INIT = { type: "INIT" } as const;
const SUBMIT = { type: "SUBMIT" } as const;
const CHANGE = (session_id: number, changes: SessionAttendanceSummaryChange) =>
	({ type: "CHANGE", session_id, changes }) as const;

function useSessionParticipationEditReducer(SAPIN: number) {
	const { session_ids, attendances } = useSessionAttendances(SAPIN);

	const reducer = useCallback(
		(
			state: SessionParticipationEditState,
			action: SessionParticipationEditAction,
		): SessionParticipationEditState => {
			if (action.type === "INIT") {
				return {
					session_ids,
					edited: attendances,
					saved: attendances,
				};
			}
			if (action.type === "CHANGE") {
				const { session_id, changes } = action;
				let edited = {
					...state.edited,
					[session_id]: { ...state.edited[session_id], ...changes },
				};
				if (isEqual(edited, state.saved)) edited = state.saved;
				return {
					...state,
					edited,
				};
			}
			if (action.type === "SUBMIT") {
				return {
					...state,
					saved: state.edited,
				};
			}
			throw new Error("Unknown action: " + action);
		},
		[session_ids, attendances],
	);

	return useReducer(reducer, {
		session_ids,
		edited: attendances,
		saved: attendances,
	});
}
export function useSessionParticipationEdit(SAPIN: number) {
	const dispatch = useAppDispatch();
	const [state, dispatchStateAction] =
		useSessionParticipationEditReducer(SAPIN);

	useEffect(() => {
		dispatchStateAction(INIT);
	}, [dispatchStateAction]);

	const onChange = useCallback(
		(session_id: number, changes: SessionAttendanceSummaryChange) => {
			dispatchStateAction(CHANGE(session_id, changes));
		},
		[dispatchStateAction],
	);

	const hasChanges = useCallback(() => state.edited !== state.saved, [state]);

	const submit = useCallback(async () => {
		const updates: SessionAttendanceSummaryUpdate[] = [];
		const adds: SessionAttendanceSummaryCreate[] = [];
		const deletes: number[] = [];
		for (const session_id of state.session_ids) {
			const changes = shallowDiff(
				state.saved[session_id],
				state.edited[session_id],
			);
			if (Object.keys(changes).length > 0) {
				const updated = {
					...state.saved[session_id],
					...changes,
				};
				if (updated.id) {
					if (isNullAttendanceSummary(updated))
						deletes.push(updated.id);
					else updates.push({ id: updated.id, changes });
				} else if (!isNullAttendanceSummary(updated)) {
					adds.push(updated);
				}
			}
		}
		if (adds.length > 0) await dispatch(addAttendanceSummaries(adds));
		if (updates.length > 0)
			await dispatch(updateAttendanceSummaries(updates));
		if (deletes.length > 0)
			await dispatch(deleteAttendanceSummaries(deletes));
		dispatchStateAction(SUBMIT);
	}, [dispatch, state, dispatchStateAction]);

	const cancel = useCallback(() => {
		dispatchStateAction(INIT);
	}, [dispatchStateAction]);

	return {
		state,
		onChange,
		hasChanges,
		submit,
		cancel,
	};
}
