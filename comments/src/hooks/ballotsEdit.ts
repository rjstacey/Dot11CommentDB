import React from "react";
import isEqual from "lodash.isequal";
import { Dictionary, EntityId } from "@reduxjs/toolkit";
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

	return React.useCallback(
		(ballot_id: number) => {
			const ballotSeries: Ballot[] = [];
			let ballot = entities[ballot_id];
			if (ballot) {
				ballotSeries.unshift(ballot);
				while (ballot?.prev_id) {
					ballot = entities[ballot.prev_id];
					if (ballot) ballotSeries.unshift(ballot);
				}
				ballot = ballotSeries[ballotSeries.length - 1];
				for (const id of ids) {
					const b = entities[id]!;
					if (b.prev_id === ballot.id) {
						ballot = b;
						ballotSeries.push(ballot);
					}
				}
			}
			return ballotSeries;
		},
		[ids, entities]
	);
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
	entities: Dictionary<Ballot>,
	ballotTemplate?: Ballot
): BallotCreate {
	const allBallots = ids.map((id) => entities[id]!);
	const now = new Date();
	const today = new Date(
		now.getFullYear(),
		now.getMonth(),
		now.getDate()
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
					new Date(b2.Start || "").valueOf()
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

function useBallotsInitState(readOnly: boolean) {
	const dispatch = useAppDispatch();
	const { selected, ids, entities, loading, valid } =
		useAppSelector(selectBallotsState);

	const initState = React.useCallback((): BallotsEditState => {
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

	const [state, setState] = React.useState<BallotsEditState>(initState);

	const resetState = React.useCallback(
		() => setState(initState),
		[setState, initState]
	);

	const onAdd = React.useCallback(() => {
		if (readOnly) {
			console.warn("onAdd: state is readOnly");
			return;
		}
		const edited = getDefaultBallot(ids, entities, state.ballots[0]);
		setState({
			action: "add",
			edited,
			saved: undefined,
			ballots: state.ballots,
		});
	}, [ids, entities, state]);

	const onDelete = React.useCallback(async () => {
		if (readOnly) {
			console.warn("onDelete: state is readOnly");
			return;
		}
		if (state.action !== "update") {
			console.warn("onDelete: bad state");
			return;
		}
		const list = state.ballots.map(getBallotId).join(", ");
		const ids = state.ballots.map((b) => b.id);
		const ok = await ConfirmModal.show(
			`Are you sure you want to delete ${list}?`
		);
		if (ok) await dispatch(deleteBallots(ids));
		dispatch(setSelected([]));
	}, [dispatch, readOnly, state]);

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
			const ids = state.ballots.map((s) => s.id);
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

	return {
		state,
		setState,
		resetState,
		onAdd,
		onDelete,
	};
}

export function useBallotsUpdate(
	readOnly: boolean,
	state: BallotsEditState,
	setState: React.Dispatch<React.SetStateAction<BallotsEditState>>,
	resetState: () => void
) {
	const dispatch = useAppDispatch();

	const hasChanges = React.useCallback(
		() =>
			state.action === "add" ||
			(state.action === "update" && state.edited !== state.saved),
		[state]
	);

	const onChange = React.useCallback(
		(changes: BallotChange) => {
			setState((state) => {
				if (readOnly) {
					console.warn("onChange: state is readOnly");
					return state;
				}
				if (state.action === "add") {
					const edited = { ...state.edited, ...changes };
					return { ...state, edited };
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
		if (readOnly) {
			console.warn("submit: state is readOnly");
			return;
		}
		if (state.action === "add") {
			const ballot = await dispatch(addBallot(state.edited));
			if (ballot) dispatch(setSelected([ballot.id]));
		} else if (state.action === "update") {
			const updates: BallotUpdate[] = [];
			const editChanges = shallowDiff(
				state.saved,
				state.edited
			) as BallotChange;
			for (const ballot of state.ballots) {
				const updatedBallot = { ...ballot, ...editChanges };
				const changes = shallowDiff(ballot, updatedBallot);
				if (Object.keys(changes).length > 0)
					updates.push({ id: ballot.id, changes });
			}
			await dispatch(updateBallots(updates));
			setState({
				...state,
				saved: state.edited,
			});
		}
	}, [state, resetState, dispatch]);

	return {
		onChange,
		hasChanges,
		submit,
	};
}

export function useBallotsEdit(readOnly: boolean) {
	const { state, setState, resetState, onAdd, onDelete } =
		useBallotsInitState(readOnly);

	const { onChange, hasChanges, submit } = useBallotsUpdate(
		readOnly,
		state,
		setState,
		resetState
	);

	return {
		state,
		onAdd,
		onDelete,
		onChange,
		hasChanges,
		submit,
		cancel: resetState,
	};
}
