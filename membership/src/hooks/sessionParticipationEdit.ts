import * as React from "react";
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

	return React.useMemo(() => {
		const session_ids = sessionIds as number[];
		const attendances = { ...membersAttendances[SAPIN] };

		for (const session_id of session_ids) {
			if (!attendances[session_id]) {
				attendances[session_id] = getNullAttendanceSummary(
					session_id,
					SAPIN
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

export function useSessionParticipationEdit(SAPIN: number) {
	const dispatch = useAppDispatch();
	const { session_ids, attendances } = useSessionAttendances(SAPIN);

	const [state, setState] = React.useState<SessionParticipationEditState>({
		session_ids,
		edited: attendances,
		saved: attendances,
	});

	React.useEffect(() => {
		setState({
			session_ids,
			edited: attendances,
			saved: attendances,
		});
	}, [session_ids, attendances]);

	const onChange = React.useCallback(
		(session_id: number, changes: SessionAttendanceSummaryChange) => {
			setState((state) => {
				let edited = {
					...state.edited,
					[session_id]: { ...state.edited[session_id], ...changes },
				};
				if (isEqual(edited, state.saved)) edited = state.saved;
				return {
					...state,
					edited,
				};
			});
		},
		[setState]
	);

	const hasChanges = React.useCallback(
		() => state.edited !== state.saved,
		[state]
	);

	const submit = React.useCallback(async () => {
		const updates: SessionAttendanceSummaryUpdate[] = [];
		const adds: SessionAttendanceSummaryCreate[] = [];
		const deletes: number[] = [];
		for (const session_id of state.session_ids) {
			const changes = shallowDiff(
				state.saved[session_id],
				state.edited[session_id]
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
		setState((state) => ({
			...state,
			saved: state.edited,
		}));
		if (adds.length > 0) await dispatch(addAttendanceSummaries(adds));
		if (updates.length > 0)
			await dispatch(updateAttendanceSummaries(updates));
		if (deletes.length > 0)
			await dispatch(deleteAttendanceSummaries(deletes));
	}, [dispatch, state, setState]);

	const cancel = React.useCallback(() => {
		setState((state) => ({
			...state,
			edited: state.saved,
		}));
	}, [setState]);

	return {
		state,
		onChange,
		hasChanges,
		submit,
		cancel,
	};
}
