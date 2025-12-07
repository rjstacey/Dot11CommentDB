import React from "react";
import isEqual from "lodash.isequal";

import { useAppSelector } from "@/store/hooks";
import {
	selectSessionRegistrationState,
	selectSessionRegistrationEntities,
	selectSessionRegistrationSession,
	type SessionRegistration,
} from "@/store/sessionRegistration";
import { selectIeeeMemberEntities } from "@/store/ieeeMembers";
import { selectMemberEntities, type MemberCreate } from "@/store/members";
import {
	getNullAttendanceSummary,
	selectAttendanceSummaryEntitiesForSession,
	type SessionAttendanceSummary,
	type SessionAttendanceSummaryChange,
} from "@/store/attendanceSummaries";

import {
	useAttendanceUpdate,
	type MultipleSessionAttendanceSummary,
} from "./attendanceActions";

export type { MultipleSessionAttendanceSummary };

/** Identify changes to attendance summary */
function sessionRegistrationAttendanceChanges(
	attendanceSummary: SessionAttendanceSummary,
	registration: SessionRegistration
) {
	const changes: SessionAttendanceSummaryChange = {};
	if (!attendanceSummary.IsRegistered) {
		changes.IsRegistered = true;
	}
	if (/virtual/i.test(registration.RegType) && attendanceSummary.InPerson) {
		changes.InPerson = false;
	}
	if (
		/in-person/i.test(registration.RegType) &&
		!attendanceSummary.InPerson
	) {
		changes.InPerson = true;
	}
	if (
		/student/i.test(registration.RegType) &&
		!attendanceSummary.DidNotAttend
	) {
		changes.DidNotAttend = true;
		changes.Notes =
			(attendanceSummary.Notes ? attendanceSummary.Notes + "; " : "") +
			"Student registration";
	}
	return changes;
}

export type SessionRegistrationEditState =
	| {
			action: "updateOne";
			ids: number[];
			registration: SessionRegistration;
			member: MemberCreate;
			attendanceEdit: MultipleSessionAttendanceSummary;
			attendanceSaved: MultipleSessionAttendanceSummary;
			attendances: SessionAttendanceSummary[];
	  }
	| {
			action: "unmatched";
			ids: number[];
			registration: SessionRegistration;
	  }
	| {
			action: "updateMany";
			ids: number[];
			attendances: SessionAttendanceSummary[];
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
	const registrationEntities = useAppSelector(
		selectSessionRegistrationEntities
	);
	const ieeeMemberEntities = useAppSelector(selectIeeeMemberEntities);
	const memberEntities = useAppSelector(selectMemberEntities);
	const attendanceSummaryEntities = useAppSelector((state) =>
		selectAttendanceSummaryEntitiesForSession(state, session.id)
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
			const registration = registrationEntities[id];
			if (!registration) throw new Error("Invalid selection");
			if (registration.CurrentSAPIN) {
				let member: MemberCreate | undefined =
					memberEntities[registration.CurrentSAPIN];
				if (!member) {
					const ieeeMember =
						ieeeMemberEntities[registration.CurrentSAPIN];
					if (ieeeMember) {
						member = {
							...ieeeMember,
							Affiliation: "",
							Status: "Non-Voter",
						};
					}
				}
				if (member) {
					const attendanceSummary =
						attendanceSummaryEntities[registration.CurrentSAPIN] ||
						getNullAttendanceSummary(
							session.id,
							registration.CurrentSAPIN
						);
					const attendanceSaved: MultipleSessionAttendanceSummary =
						attendanceSummary;
					const changes = sessionRegistrationAttendanceChanges(
						attendanceSummary,
						registration
					);
					const attendanceEdit: MultipleSessionAttendanceSummary =
						Object.keys(changes).length > 0
							? { ...attendanceSummary, ...changes }
							: attendanceSummary;
					return {
						action: "updateOne",
						ids,
						registration,
						member,
						attendanceEdit,
						attendanceSaved,
						attendances: [attendanceSummary],
					} satisfies SessionRegistrationEditState;
				}
			}
			return {
				action: "unmatched",
				ids,
				registration,
			} satisfies SessionRegistrationEditState;
		} else {
			const attendances: SessionAttendanceSummary[] = [];
			for (const id of ids) {
				const registration = registrationEntities[id];
				if (!registration) throw new Error("Invalid selection");
				if (registration.CurrentSAPIN) {
					const attendanceSummary =
						attendanceSummaryEntities[registration.CurrentSAPIN] ||
						getNullAttendanceSummary(
							session.id,
							registration.CurrentSAPIN
						);
					const changes = sessionRegistrationAttendanceChanges(
						attendanceSummary,
						registration
					);
					const attendanceEdit: SessionAttendanceSummary =
						Object.keys(changes).length > 0
							? { ...attendanceSummary, ...changes }
							: attendanceSummary;
					attendances.push(attendanceEdit);
				}
			}
			return {
				action: "updateMany",
				ids,
				attendances,
			} satisfies SessionRegistrationEditState;
		}
	}, [
		loading,
		valid,
		ids,
		ieeeMemberEntities,
		attendanceSummaryEntities,
		registrationEntities,
		session,
	]);
}

export function useSessionRegistrationEdit(ids: number[], readOnly: boolean) {
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
		[readOnly, setState]
	);

	const hasChanges = React.useCallback(
		() =>
			(state.action === "updateOne" &&
				state.attendanceEdit !== state.attendanceSaved) ||
			(state.action === "updateMany" && state.attendances.length > 0),
		[state]
	);

	const attendanceUpdate = useAttendanceUpdate();

	const submit = React.useCallback(async () => {
		const { action } = state;
		if (action === "updateOne") {
			await attendanceUpdate(
				state.attendances,
				state.attendanceEdit,
				state.attendanceSaved
			);
		} else if (action === "updateMany") {
			await attendanceUpdate(state.attendances);
		}
	}, [attendanceUpdate, state]);

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
	}, [setState, initState]);

	return {
		state,
		submit,
		cancel,
		hasChanges,
		onChange,
	};
}
