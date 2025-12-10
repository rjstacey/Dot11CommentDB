import React from "react";
import isEqual from "lodash.isequal";
import { DateTime } from "luxon";
import {
	deepMergeTagMultiple,
	deepMerge,
	deepDiff,
	ConfirmModal,
	MULTIPLE,
} from "@common";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectWebexAccountDefaultId } from "@/store/webexAccounts";
import {
	selectWebexMeetingsState,
	selectSyncedWebexMeetingEntities,
	addWebexMeeting,
	updateWebexMeetings,
	deleteWebexMeetings,
	setSelected,
	WebexMeeting,
	WebexMeetingOptions,
	WebexAudioConnectionOptions,
	WebexMeetingUpdate,
	SyncedWebexMeeting,
} from "@/store/webexMeetings";
import { updateMeetings, Meeting } from "@/store/meetings";
import {
	defaultWebexMeeting,
	convertEntryToWebexMeeting,
	convertWebexMeetingToEntry,
	type WebexMeetingEntry,
	type PartialWebexMeetingEntry,
	type MultipleWebexMeetingEntry,
} from "./convertWebexMeetingEntry";

type WebexMeetingEditState =
	| {
			action: null;
			message: string;
	  }
	| {
			action: "add";
			edited: MultipleWebexMeetingEntry;
			saved: undefined;
	  }
	| {
			action: "update";
			edited: MultipleWebexMeetingEntry;
			saved: MultipleWebexMeetingEntry;
			webexMeetings: WebexMeeting[];
	  };

function useWebexMeetingsEditState() {
	const dispatch = useAppDispatch();
	const { loading, valid, selected } = useAppSelector(
		selectWebexMeetingsState
	);
	const entities = useAppSelector(selectSyncedWebexMeetingEntities);

	const initState = React.useCallback(() => {
		const webexMeetings: SyncedWebexMeeting[] = selected
			.filter((id) => entities[id])
			.map((id) => {
				// Redo 'start' and 'end' - there is an extra zero on the milliseconds
				let webexMeeting = entities[id]!;
				webexMeeting = {
					...webexMeeting,
					start: DateTime.fromISO(webexMeeting.start, {
						zone: webexMeeting.timezone,
					}).toISO()!,
					end: DateTime.fromISO(webexMeeting.end, {
						zone: webexMeeting.timezone,
					}).toISO()!,
				};
				return webexMeeting;
			});

		if (loading && !valid) {
			return {
				action: null,
				message: "Loading...",
			} satisfies WebexMeetingEditState;
		} else if (webexMeetings.length === 0) {
			return {
				action: null,
				message: "Nothing selected",
			} satisfies WebexMeetingEditState;
		} else {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const entryMerge: any = webexMeetings.reduce(
				(entry, webexMeeting) =>
					deepMergeTagMultiple(
						entry,
						convertWebexMeetingToEntry(webexMeeting)
					),
				{}
			);
			const meetingOptions: WebexMeetingOptions =
				!entryMerge.meetingOptions ||
				Object.values(entryMerge.meetingOptions).includes(MULTIPLE)
					? defaultWebexMeeting.meetingOptions
					: entryMerge.meetingOptions;
			const audioConnectionOptions: WebexAudioConnectionOptions =
				!entryMerge.audioConnectionOptions ||
				Object.values(entryMerge.audioConnectionOptions).includes(
					MULTIPLE
				)
					? defaultWebexMeeting.audioConnectionOptions
					: entryMerge.audioConnectionOptions;
			const edited = {
				...entryMerge,
				meetingOptions,
				audioConnectionOptions,
			};
			return {
				action: "update",
				edited,
				saved: edited,
				webexMeetings,
			} satisfies WebexMeetingEditState;
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
			const ids = state.webexMeetings.map((m) => m.id);
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

	const [state, setState] = React.useState<WebexMeetingEditState>(initState);

	return [state, setState, resetState] as const;
}

export function useWebexMeetingsEdit(readOnly: boolean) {
	const dispatch = useAppDispatch();
	const defaultWebexAccountId = useAppSelector(selectWebexAccountDefaultId);

	const [state, setState, resetState] = useWebexMeetingsEditState();

	const hasChanges = React.useCallback(
		() =>
			state.action === "add" ||
			(state.action === "update" && state.edited !== state.saved),
		[state]
	);

	const onChange = React.useCallback(
		(changes: PartialWebexMeetingEntry) => {
			setState((state) => {
				if (readOnly) {
					console.warn("onChange: state is readOnly");
					return state;
				}
				if (state.action === "add") {
					const edited: MultipleWebexMeetingEntry = deepMerge(
						state.edited,
						changes
					);
					return { ...state, edited } satisfies WebexMeetingEditState;
				} else if (state.action === "update") {
					let edited: MultipleWebexMeetingEntry = deepMerge(
						state.edited,
						changes
					);
					// If the changes revert to the original, then store entry as original for easy hasUpdates comparison
					changes = deepDiff(state.saved, edited) || {};
					if (Object.keys(changes).length === 0) edited = state.saved;
					return { ...state, edited } satisfies WebexMeetingEditState;
				}
				console.warn("onChange: in unexpected state");
				return state;
			});
		},
		[readOnly, setState]
	);

	const submit = React.useCallback(async () => {
		if (state.action === "add") {
			const entry = state.edited as WebexMeetingEntry;
			const webexMeeting = convertEntryToWebexMeeting(entry);
			const id = await dispatch(
				addWebexMeeting(entry.accountId!, webexMeeting)
			);
			if (entry.meetingId)
				await dispatch(
					updateMeetings([
						{
							id: entry.meetingId,
							changes: {
								webexAccountId: entry.accountId,
								webexMeetingId: id,
							},
						},
					])
				);
			setState({
				action: null,
				message: "Adding...",
			});
			dispatch(setSelected(id ? [id] : []));
		} else if (state.action === "update") {
			const { edited, saved, webexMeetings } = state;

			// Find differences
			const diff: PartialWebexMeetingEntry =
				deepDiff(saved, edited) || {};
			const webexMeetingUpdates: WebexMeetingUpdate[] = [];
			const meetingUpdates: {
				id: number;
				changes: Partial<Meeting>;
			}[] = [];
			console.log(diff);
			for (const webexMeeting of webexMeetings) {
				const local: WebexMeetingEntry = deepMerge(
					convertWebexMeetingToEntry(webexMeeting),
					diff
				);
				const updated = convertEntryToWebexMeeting(local);
				const changes: Partial<SyncedWebexMeeting> =
					deepDiff(webexMeeting, updated) || {};
				console.log(local, updated, changes);
				if (changes.meetingId) {
					// Associating with a meeting
					meetingUpdates.push({
						id: changes.meetingId,
						changes: {
							webexAccountId: updated.accountId,
							webexMeetingId: webexMeeting.id,
						},
					});
					delete changes.meetingId;
				}
				if (Object.keys(changes).length > 0) {
					webexMeetingUpdates.push({
						...updated,
						id: webexMeeting.id,
					});
				}
			}
			console.log(webexMeetingUpdates, meetingUpdates);
			if (webexMeetingUpdates.length > 0)
				await dispatch(updateWebexMeetings(webexMeetingUpdates));
			if (meetingUpdates.length > 0)
				await dispatch(updateMeetings(meetingUpdates));
			setState({ ...state, saved: state.edited });
		}
	}, []);

	const onAdd = React.useCallback(async () => {
		if (readOnly) {
			console.warn("onAdd: state is readOnly");
			return;
		}
		if (state.action === "update" && hasChanges()) {
			const ok = await ConfirmModal.show(
				`Changes not applied! Do you want to discard changes?`
			);
			if (!ok) return;
		}
		const edited = {
			...defaultWebexMeeting,
			meetingOptions: defaultWebexMeeting.meetingOptions!,
			audioConnectionOptions: defaultWebexMeeting.audioConnectionOptions!,
			accountId: defaultWebexAccountId,
		};
		setState({
			action: "add",
			edited,
			saved: undefined,
		});
		dispatch(setSelected([]));
	}, [readOnly, dispatch]);

	const onDelete = React.useCallback(async () => {
		if (readOnly) {
			console.warn("onDelete: state is readOnly");
			return;
		}
		if (state.action !== "update") {
			console.warn("onDelete: in unexpected state");
			return;
		}

		const { webexMeetings } = state;
		const ok = await ConfirmModal.show(
			"Are you sure you want to delete the selected " +
				(webexMeetings.length > 1
					? webexMeetings.length + "entries?"
					: "entry?")
		);
		if (!ok) return;
		await dispatch(deleteWebexMeetings(webexMeetings));
	}, [dispatch]);

	return {
		state,
		hasChanges,
		onChange,
		submit,
		cancel: resetState,
		onAdd,
		onDelete,
	};
}
