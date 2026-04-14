import { useCallback, useEffect, useReducer } from "react";
import { shallowDiff } from "@common";
import isEqual from "lodash.isequal";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
	selectBallotParticipationEntities,
	updateBallotParticipation,
	BallotSeriesParticipationSummary,
	BallotParticipationUpdate,
} from "@/store/ballotParticipation";

export type BallotParticipationEditState = {
	series_ids: number[];
	edited: Record<number, BallotSeriesParticipationSummary>;
	saved: Record<number, BallotSeriesParticipationSummary>;
};
type BallotParticipationEditAction =
	| {
			type: "INIT" | "SUBMIT";
	  }
	| {
			type: "CHANGE";
			series_id: number;
			changes: Partial<BallotSeriesParticipationSummary>;
	  };
const INIT = { type: "INIT" } as const;
const SUBMIT = { type: "SUBMIT" } as const;
const CHANGE = (
	series_id: number,
	changes: Partial<BallotSeriesParticipationSummary>,
) => ({ type: "CHANGE", series_id, changes }) as const;

function useBallotParticipationEditReducer(SAPIN: number) {
	const entities = useAppSelector(selectBallotParticipationEntities);

	const initState = useCallback(() => {
		const series_ids: number[] = [];
		const edited: Record<number, BallotSeriesParticipationSummary> = {};
		entities[SAPIN]?.ballotSeriesParticipationSummaries
			.slice(-3) // Last 3 ballot series
			.reverse()
			.forEach((summary) => {
				const id = summary.series_id;
				series_ids.push(id);
				edited[id] = summary;
			});
		return {
			series_ids,
			edited,
			saved: edited,
		} satisfies BallotParticipationEditState;
	}, [SAPIN, entities]);

	const reducer = useCallback(
		(
			state: BallotParticipationEditState,
			action: BallotParticipationEditAction,
		): BallotParticipationEditState => {
			if (action.type === "INIT") {
				return initState();
			}
			if (action.type === "CHANGE") {
				const { series_id, ...changes } = action;
				let edited = {
					...state.edited,
					[action.series_id]: {
						...state.edited[series_id],
						...changes,
					},
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
		[initState],
	);

	return useReducer(reducer, undefined, initState);
}

export function useBallotParticipationEdit(SAPIN: number) {
	const dispatch = useAppDispatch();
	const [state, dispatchStateAction] =
		useBallotParticipationEditReducer(SAPIN);

	useEffect(() => {
		dispatchStateAction(INIT);
	}, [SAPIN]);

	const onChange = useCallback(
		(
			series_id: number,
			changes: Partial<BallotSeriesParticipationSummary>,
		) => {
			dispatchStateAction(CHANGE(series_id, changes));
		},
		[],
	);

	const hasChanges = useCallback(() => state.edited !== state.saved, [state]);

	const submit = useCallback(async () => {
		const updates: BallotParticipationUpdate[] = [];
		for (const series_id of state.series_ids) {
			const changes = shallowDiff(
				state.saved[series_id],
				state.edited[series_id],
			);
			if (Object.keys(changes).length > 0)
				updates.push({ id: series_id, changes });
		}
		if (updates.length > 0)
			await dispatch(updateBallotParticipation(SAPIN, updates));
		dispatchStateAction(SUBMIT);
	}, [SAPIN, state]);

	const cancel = useCallback(() => {
		dispatchStateAction(INIT);
	}, []);

	return {
		state,
		onChange,
		hasChanges,
		submit,
		cancel,
	};
}
