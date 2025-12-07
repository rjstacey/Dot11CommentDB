import * as React from "react";
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

export function useBallotParticipationEdit(SAPIN: number) {
	const dispatch = useAppDispatch();
	const entities = useAppSelector(selectBallotParticipationEntities);

	const initState = React.useCallback(() => {
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

	const [state, setState] =
		React.useState<BallotParticipationEditState>(initState);

	React.useEffect(() => {
		setState(initState);
	}, [initState]);

	const onChange = React.useCallback(
		(
			series_id: number,
			changes: Partial<BallotSeriesParticipationSummary>
		) => {
			setState((state) => {
				let edited = {
					...state.edited,
					[series_id]: { ...state.edited[series_id], ...changes },
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
		const updates: BallotParticipationUpdate[] = [];

		for (const series_id of state.series_ids) {
			const changes = shallowDiff(
				state.saved[series_id],
				state.edited[series_id]
			);
			if (Object.keys(changes).length > 0)
				updates.push({ id: series_id, changes });
		}
		setState((state) => ({
			...state,
			saved: state.edited,
		}));
		if (updates.length > 0)
			await dispatch(updateBallotParticipation(SAPIN, updates));
	}, [dispatch, SAPIN, state, setState]);

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
