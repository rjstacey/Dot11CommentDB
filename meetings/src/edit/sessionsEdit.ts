import React from "react";
import isEqual from "lodash.isequal";
import {
	ConfirmModal,
	deepMergeTagMultiple,
	shallowDiff,
	type Multiple,
} from "@common";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
	addSession,
	updateSession,
	deleteSessions,
	setSelected,
	selectSessionsState,
	type Session,
	SessionCreate,
} from "@/store/sessions";
import { SessionChanges } from "@schemas/sessions";

export type MultipleSession = Multiple<Session>;

export type SessionsEditState =
	| {
			action: null;
			message: string;
	  }
	| {
			action: "add";
			edited: SessionCreate;
			saved: undefined;
	  }
	| {
			action: "update";
			edited: MultipleSession;
			saved: MultipleSession;
			sessions: Session[];
	  };

const defaultSession: SessionCreate = {
	number: null,
	name: "",
	type: "p",
	isCancelled: false,
	imatMeetingId: null,
	startDate: new Date().toISOString().substring(0, 10),
	endDate: new Date().toISOString().substring(0, 10),
	timezone: "America/New_York",
	groupId: null,
	rooms: [],
	timeslots: [],
	defaultCredits: [],
	OrganizerID: "",
};

function useSessionsEditState() {
	const dispatch = useAppDispatch();
	const { loading, valid, selected, entities } =
		useAppSelector(selectSessionsState);

	const initState = React.useCallback(() => {
		const sessions = selected.map((id) => entities[id]!).filter(Boolean);
		if (loading && !valid) {
			return {
				action: null,
				message: "Loading...",
			} satisfies SessionsEditState;
		} else if (sessions.length === 0) {
			return {
				action: null,
				message: "Nothing selected",
			} satisfies SessionsEditState;
		} else {
			let edited = {} as MultipleSession;
			for (const s of sessions)
				edited = deepMergeTagMultiple(edited, s) as MultipleSession;
			return {
				action: "update",
				edited,
				saved: edited,
				sessions,
			} satisfies SessionsEditState;
		}
	}, [loading, valid, selected, entities]);

	const resetState = React.useCallback(
		() => setState(initState),
		[initState]
	);

	React.useEffect(() => {
		if (state.action === "add") {
			if (selected.length > 0) {
				ConfirmModal.show(
					"Changes not applied! Do you want to discard changes?"
				).then((ok) => {
					if (ok) resetState();
					else dispatch(setSelected([]));
				});
			}
		} else if (state.action === "update") {
			if (state.edited === state.saved) {
				resetState();
				return;
			}
			const ids = state.sessions.map((s) => s.id);
			if (!isEqual(selected, ids)) {
				ConfirmModal.show(
					"Changes not applied! Do you want to discard changes?"
				).then((ok) => {
					if (ok) resetState();
					else dispatch(setSelected(ids));
				});
			}
		} else {
			resetState();
		}
	}, [selected, resetState]);

	const [state, setState] = React.useState<SessionsEditState>(initState);

	return [state, setState, resetState] as const;
}

export function useSessionsEdit(readOnly: boolean) {
	const dispatch = useAppDispatch();

	const [state, setState, resetState] = useSessionsEditState();

	const hasChanges = React.useCallback(
		() =>
			state.action === "add" ||
			(state.action === "update" && state.edited !== state.saved),
		[state]
	);

	const onChange = React.useCallback(
		(changes: SessionChanges) => {
			setState((state) => {
				if (readOnly) {
					console.warn("onChange: making changes while readOnly");
					return state;
				}
				if (state.action === "add") {
					return {
						...state,
						edited: { ...state.edited, ...changes },
					};
				} else if (state.action === "update") {
					let edited = { ...state.edited, ...changes };
					if (isEqual(edited, state.saved)) edited = state.saved;
					return { ...state, edited };
				}
				console.warn("onChange: bad state");
				return state;
			});
		},
		[readOnly, setState]
	);

	const submit = React.useCallback(async () => {
		if (readOnly || state.action === null) {
			console.warn("submit: bad state");
			return;
		}
		if (state.action === "add") {
			setState({
				action: null,
				message: "Adding...",
			});
			const id = await dispatch(addSession(state.edited));
			dispatch(setSelected(id ? [id] : []));
		} else if (state.action === "update") {
			const { edited, saved, sessions } = state;
			const changes = shallowDiff(saved, edited) as Partial<Session>;
			const p: Promise<void>[] = [];
			if (Object.keys(changes).length > 0) {
				for (const s of sessions)
					p.push(dispatch(updateSession(s.id, changes)));
			}
			await Promise.all(p);
			setState({
				...state,
				saved: edited,
			});
		}
	}, [readOnly, setState]);

	const disableAdd = readOnly || (state.action === "update" && hasChanges());
	const onAdd = React.useCallback(() => {
		setState({ action: "add", edited: defaultSession, saved: undefined });
		dispatch(setSelected([]));
	}, [dispatch]);

	const disableDelete = readOnly || state.action === "add";
	const onDelete = React.useCallback(async () => {
		if (state.action !== "update") {
			console.warn("onDelete: bad state");
			return;
		}
		const ids = state.sessions.map((s) => s.id);
		const ok = await ConfirmModal.show(
			`Are you sure you want to delete ${ids.length} sessions?`
		);
		if (ok) await dispatch(deleteSessions(ids));
	}, [dispatch, state]);

	return {
		state,
		hasChanges,
		onChange,
		disableAdd,
		onAdd,
		disableDelete,
		onDelete,
		submit,
		cancel: resetState,
	};
}
