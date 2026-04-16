import React, { useCallback, useEffect, useReducer } from "react";
import isEqual from "lodash.isequal";
import { EntityId } from "@reduxjs/toolkit";
import {
	deepMergeTagMultiple,
	ConfirmModal,
	type Multiple,
	shallowDiff,
} from "@common";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
	deleteBallots,
	addBallot,
	setSelectedBallots as setSelected,
	selectBallotsState,
	selectBallotEntities,
	selectBallotIds,
	Ballot,
	BallotType,
	getBallotId,
	BallotCreate,
	BallotUpdate,
	BallotChange,
	updateBallots,
} from "@/store/ballots";

export function useGetBallotSeries() {
	const ids = useAppSelector(selectBallotIds);
	const entities = useAppSelector(selectBallotEntities);

	/** Get previous ballots starting with supplied prev_id */
	const getPrevBallots = useCallback(
		(prev_id: number | null) => {
			const ballotSeries: Ballot[] = [];
			let ballot: Ballot | undefined;
			while (prev_id) {
				ballot = entities[prev_id];
				if (ballot) {
					prev_id = ballot.prev_id;
					ballotSeries.unshift(ballot);
				}
			}
			return ballotSeries;
		},
		[ids, entities],
	);

	/** Get ballot series that references the supplied ballot_id */
	const getFutureBallots = useCallback(
		(ballot_id: number) => {
			const ballotSeries: Ballot[] = [];
			const ballots = ids.map((id) => entities[id]!);
			let ballot: Ballot | undefined;
			do {
				ballot = ballots.find((b) => b.prev_id === ballot_id);
				if (ballot) {
					ballot_id = ballot.id;
					ballotSeries.push(ballot);
				}
			} while (ballot);
			return ballotSeries;
		},
		[ids, entities],
	);

	/** Get ballot series that potentially precedes the supplied ballot */
	const getPotentialPrevBallots = useCallback(
		({
			id,
			groupId,
			Type,
			Project,
			Start,
		}: {
			id?: number;
			groupId: string;
			Type: BallotType;
			Project: string;
			Start: string | null;
		}) => {
			const prevBallots = ids
				.map((id) => entities[id]!)
				.filter(
					(b) =>
						b.groupId === groupId &&
						b.Type === Type &&
						b.Project === Project &&
						new Date(b.Start!).getTime() <
							new Date(Start!).getTime() &&
						b.id !== id,
				)
				.sort(
					(b1, b2) =>
						new Date(b1.Start!).getTime() -
						new Date(b2.Start!).getTime(),
				);
			if (prevBallots.length > 0) {
				const ballot = prevBallots[prevBallots.length - 1];
				return getPrevBallots(ballot.prev_id).concat(ballot);
			}
			return [];
		},
		[ids, entities, getPrevBallots],
	);

	return {
		getPrevBallots,
		getPotentialPrevBallots,
		getFutureBallots,
	};
}

function nextBallotNumber(ballots: Ballot[], type: number) {
	let maxNumber = 0;
	for (const b of ballots) {
		if (b.Type === type && b.number && b.number > maxNumber)
			maxNumber = b.number;
	}
	return maxNumber + 1;
}

export function getDefaultBallot(
	ids: EntityId[],
	entities: Record<EntityId, Ballot>,
	ballotTemplate?: Ballot,
): BallotCreate {
	const allBallots = ids.map((id) => entities[id]!);
	const now = new Date();
	const today = new Date(
		now.getFullYear(),
		now.getMonth(),
		now.getDate(),
	).toISOString();
	let groupId: string = "";
	let project: string = "";
	let type = 0;
	let number = 0;
	//let stage = 0;
	let prev_id: number | null = null;
	if (ballotTemplate) {
		groupId = ballotTemplate.groupId;
		project = ballotTemplate.Project;
		type = ballotTemplate.Type;
		const ballots = allBallots
			.filter((b) => b.groupId === groupId && b.Project === project)
			.sort(
				(b1, b2) =>
					new Date(b1.Start || "").valueOf() -
					new Date(b2.Start || "").valueOf(),
			);
		const latestBallot = ballots[ballots.length - 1];
		if (latestBallot) {
			if (latestBallot.Type === BallotType.CC) {
				type = BallotType.WG;
			} else if (latestBallot.Type === BallotType.WG) {
				if (latestBallot.IsComplete) {
					type = BallotType.SA;
				} else {
					type = BallotType.WG;
					prev_id = latestBallot.id;
				}
			} else if (latestBallot.Type === BallotType.SA) {
				type = BallotType.SA;
				prev_id = latestBallot.id;
			}
		}
	}
	number = nextBallotNumber(allBallots, type);
	const ballot: BallotCreate = {
		groupId,
		Project: project,
		Type: type,
		number,
		EpollNum: 0,
		Document: "",
		Topic: "",
		Start: today,
		End: today,
		prev_id,
		IsComplete: false,
	};
	return ballot;
}

export type BallotMultiple = Multiple<Ballot>;

export type BallotsEditState = (
	| {
			action: null;
			message: string;
	  }
	| {
			action: "add";
			edited: BallotCreate;
			saved: undefined;
	  }
	| {
			action: "update";
			edited: BallotMultiple;
			saved: BallotMultiple;
	  }
) & { ballots: Ballot[] };
export type BallotsEditAction =
	| {
			type: "INIT" | "CREATE" | "SUBMIT";
	  }
	| {
			type: "CHANGE";
			changes: BallotChange;
	  };
export const INIT = { type: "INIT" } as const;
const CREATE = { type: "CREATE" } as const;
const SUBMIT = { type: "SUBMIT" } as const;
const CHANGE = (changes: BallotChange) =>
	({ type: "CHANGE", changes }) as const;

function useBallotsEditReducer() {
	const { selected, ids, entities, loading, valid } =
		useAppSelector(selectBallotsState);

	const initState = useCallback((): BallotsEditState => {
		const ballots = selected.map((id) => entities[id]!).filter(Boolean);
		if (loading && !valid) {
			return {
				action: null,
				message: "Loading...",
				ballots,
			} satisfies BallotsEditState;
		} else if (ballots.length === 0) {
			return {
				action: null,
				message: "Nothing selected",
				ballots,
			} satisfies BallotsEditState;
		} else {
			let edited = {} as BallotMultiple;
			for (const ballot of ballots)
				edited = deepMergeTagMultiple(edited, ballot) as BallotMultiple;
			return {
				action: "update",
				edited,
				saved: edited,
				ballots,
			} satisfies BallotsEditState;
		}
	}, [selected, entities, loading, valid]);

	const reducer = useCallback(
		(
			state: BallotsEditState,
			action: BallotsEditAction,
		): BallotsEditState => {
			if (action.type === "INIT") {
				return initState();
			} else if (action.type === "CREATE") {
				const edited = getDefaultBallot(
					ids,
					entities,
					state.ballots[0],
				);
				return {
					action: "add",
					edited,
					saved: undefined,
					ballots: state.ballots,
				};
			} else if (action.type === "CHANGE") {
				if (state.action === "add") {
					const edited = { ...state.edited, ...action.changes };
					return { ...state, edited };
				} else if (state.action === "update") {
					let edited = { ...state.edited, ...action.changes };
					if (isEqual(edited, state.saved)) edited = state.saved;
					return { ...state, edited };
				}
				console.warn("CHANGE: bad state");
				return state;
			} else if (action.type === "SUBMIT") {
				if (state.action === "add") {
					return {
						...state,
						action: null,
						message: "Ballot added",
					};
				} else if (state.action === "update") {
					return initState();
				}
				return state;
			}
			return state;
		},
		[initState, ids, entities],
	);

	return useReducer(reducer, undefined, initState);
}

export function useBallotsUpdate(
	readOnly: boolean,
	state: BallotsEditState,
	dispatchStateAction: React.Dispatch<BallotsEditAction>,
) {
	const dispatch = useAppDispatch();

	const hasChanges = useCallback(
		() =>
			state.action === "add" ||
			(state.action === "update" && state.edited !== state.saved),
		[state],
	);

	const onChange = useCallback(
		(changes: BallotChange) => {
			if (readOnly || state.action === null) {
				console.warn("onChange: bad state");
				return state;
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
			const ballot = await dispatch(addBallot(state.edited));
			dispatchStateAction(SUBMIT);
			if (ballot) dispatch(setSelected([ballot.id]));
		} else if (state.action === "update") {
			const updates: BallotUpdate[] = [];
			const editChanges = shallowDiff(
				state.saved,
				state.edited,
			) as BallotChange;
			for (const ballot of state.ballots) {
				const updatedBallot = { ...ballot, ...editChanges };
				const changes = shallowDiff(ballot, updatedBallot);
				if (Object.keys(changes).length > 0)
					updates.push({ id: ballot.id, changes });
			}
			await dispatch(updateBallots(updates));
			dispatchStateAction(SUBMIT);
		}
	}, [readOnly, state, dispatchStateAction]);

	const cancel = useCallback(() => {
		dispatchStateAction(INIT);
	}, [dispatchStateAction]);

	return {
		hasChanges,
		onChange,
		submit,
		cancel,
	};
}

export function useBallotsEdit(readOnly: boolean) {
	const dispatch = useAppDispatch();
	const { selected } = useAppSelector(selectBallotsState);
	const [state, dispatchStateAction] = useBallotsEditReducer();

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
			const ids = state.ballots.map((s) => s.id);
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
	}, [selected]);

	const { hasChanges, onChange, submit, cancel } = useBallotsUpdate(
		readOnly,
		state,
		dispatchStateAction,
	);

	const addDisabled = readOnly || hasChanges();
	const onAdd = useCallback(() => {
		if (addDisabled) {
			console.warn("onAdd: bad state");
			return;
		}
		dispatchStateAction(CREATE);
	}, [addDisabled]);

	const deleteDisabled = readOnly || state.action !== "update";
	const onDelete = useCallback(async () => {
		if (deleteDisabled) {
			console.warn("onDelete: bad state");
			return;
		}
		const list = state.ballots.map(getBallotId).join(", ");
		const ids = state.ballots.map((b) => b.id);
		const ok = await ConfirmModal.show(
			`Are you sure you want to delete ${list}?`,
		);
		if (ok) {
			dispatchStateAction(SUBMIT);
			await dispatch(deleteBallots(ids));
			dispatch(setSelected([]));
		}
	}, [deleteDisabled, state]);

	return {
		state,
		onChange,
		hasChanges,
		submit,
		cancel,
		addDisabled,
		onAdd,
		deleteDisabled,
		onDelete,
	};
}
