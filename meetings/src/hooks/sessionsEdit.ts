import { useCallback, useEffect, useReducer } from "react";
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
	type SessionCreate,
	type SessionChanges,
} from "@/store/sessions";

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
type SessionsEditAction =
	| {
			type: "INIT";
	  }
	| {
			type: "CREATE";
	  }
	| {
			type: "CHANGE";
			changes: SessionChanges;
	  }
	| {
			type: "SUBMIT";
	  };
const INIT = { type: "INIT" } as const;
const CREATE = { type: "CREATE" } as const;
const SUBMIT = { type: "SUBMIT" } as const;
const CHANGE = (changes: SessionChanges) =>
	({ type: "CHANGE", changes }) as const;

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

function useSessionsEditReducer() {
	const { loading, valid, selected, entities } =
		useAppSelector(selectSessionsState);

	const init = useCallback(() => {
		if (loading && !valid) {
			return {
				action: null,
				message: "Loading...",
			} satisfies SessionsEditState;
		}
		const sessions = selected.map((id) => entities[id]!).filter(Boolean);
		if (sessions.length === 0) {
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

	const reducer = useCallback(
		(
			state: SessionsEditState,
			action: SessionsEditAction,
		): SessionsEditState => {
			if (action.type === "INIT") {
				return init();
			}
			if (action.type === "CREATE") {
				return {
					action: "add",
					edited: defaultSession,
					saved: undefined,
				};
			}
			if (action.type === "CHANGE") {
				if (state.action === "add") {
					return {
						...state,
						edited: { ...state.edited, ...action.changes },
					};
				} else if (state.action === "update") {
					let edited = { ...state.edited, ...action.changes };
					if (isEqual(edited, state.saved)) edited = state.saved;
					return { ...state, edited };
				}
				return state;
			}
			if (action.type === "SUBMIT") {
				if (state.action === "add") {
					return {
						action: null,
						message: "Adding...",
					};
				} else if (state.action === "update") {
					return {
						...state,
						saved: state.edited,
					};
				}
				return state;
			}
			console.error("Unknown action:", action);
			return state;
		},
		[init],
	);

	return useReducer(reducer, undefined, init);
}

export function useSessionsEdit(readOnly: boolean) {
	const dispatch = useAppDispatch();
	const { selected } = useAppSelector(selectSessionsState);

	const [state, dispatchStateAction] = useSessionsEditReducer();

	useEffect(() => {
		if (state.action === "add") {
			if (selected.length > 0) {
				ConfirmModal.show(
					"Changes not applied! Do you want to discard changes?",
				).then((ok) => {
					if (ok) dispatchStateAction(INIT);
					else dispatch(setSelected([]));
				});
			}
		} else if (state.action === "update") {
			if (state.edited === state.saved) {
				dispatchStateAction(INIT);
				return;
			}
			const ids = state.sessions.map((s) => s.id);
			if (!isEqual(selected, ids)) {
				ConfirmModal.show(
					"Changes not applied! Do you want to discard changes?",
				).then((ok) => {
					if (ok) dispatchStateAction(INIT);
					else dispatch(setSelected(ids));
				});
			}
		} else {
			dispatchStateAction(INIT);
		}
	}, [selected, dispatchStateAction]);

	const hasChanges = useCallback(
		() =>
			state.action === "add" ||
			(state.action === "update" && state.edited !== state.saved),
		[state],
	);

	const onChange = useCallback(
		(changes: SessionChanges) => {
			if (readOnly || state.action === null) {
				console.warn("onChange: bad state");
				return;
			}
			dispatchStateAction(CHANGE(changes));
		},
		[readOnly, state.action, dispatchStateAction],
	);

	const submit = useCallback(async () => {
		if (readOnly || state.action === null) {
			console.warn("submit: bad state");
			return;
		}
		if (state.action === "add") {
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
		}
		dispatchStateAction(SUBMIT);
	}, [readOnly, state, dispatch, dispatchStateAction]);

	const cancel = useCallback(() => {
		dispatchStateAction(INIT);
	}, [dispatchStateAction]);

	const disableAdd = readOnly || (state.action === "update" && hasChanges());
	const onAdd = useCallback(() => {
		dispatchStateAction(CREATE);
		dispatch(setSelected([]));
	}, [dispatch, dispatchStateAction]);

	const disableDelete = readOnly || state.action !== "update";
	const onDelete = useCallback(async () => {
		if (disableDelete) {
			console.warn("onDelete: bad state");
			return;
		}
		const ids = state.sessions.map((s) => s.id);
		const ok = await ConfirmModal.show(
			`Are you sure you want to delete ${ids.length} sessions?`,
		);
		if (ok) {
			await dispatch(deleteSessions(ids));
			dispatchStateAction(SUBMIT);
			dispatch(setSelected([]));
		}
	}, [state, disableDelete, dispatch, dispatchStateAction]);

	return {
		state,
		hasChanges,
		onChange,
		disableAdd,
		onAdd,
		disableDelete,
		onDelete,
		submit,
		cancel,
	};
}
