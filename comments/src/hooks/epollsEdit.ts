import React from "react";
import { Dictionary } from "@reduxjs/toolkit";
import { useAppSelector } from "@/store/hooks";
import { selectTopLevelGroupId } from "@/store/groups";
import {
	selectEpollsState,
	selectSyncedEntities,
	type SyncedEpoll,
} from "@/store/epolls";
import {
	selectBallotIds,
	selectBallotEntities,
	BallotType,
	type Ballot,
} from "@/store/ballots";
import {
	getDefaultBallot,
	useBallotsUpdate,
	type BallotsEditState,
} from "./ballotsEdit";

function ePollToBallot(
	epoll: SyncedEpoll,
	groupId: string,
	ballotEntities: Dictionary<Ballot>
): Partial<Ballot> {
	const ballot: Partial<Ballot> = {
		EpollNum: epoll.id,
		Start: epoll.start,
		End: epoll.end,
		Document: epoll.document,
		Topic: epoll.topic,
		groupId,
	};
	// Get ballot type and number; see if the ePoll name has something like "CC53" or "LB245"
	const m1 = epoll.name.match(/(CC|LB)(\d+)/);
	if (m1) {
		ballot.Type = m1[1] === "CC" ? BallotType.CC : BallotType.WG;
		ballot.number = Number(m1[2]);
	}
	// Get project and document version; see if the ePoll topic has something like "P802.11ax/D4.0" or "P802.11bn 3.2"
	const m2 = epoll.topic.match(/(P802[^\s]*)[\s/]+(D{0,1}\d+(.\d+)*)/);
	if (m2) {
		ballot.Project = m2[1];
		ballot.Document = m2[2];
		for (const b of Object.values(ballotEntities) as Ballot[]) {
			if (b.Project === ballot.Project) {
				ballot.groupId = b.groupId;
				ballot.workingGroupId = b.workingGroupId;
				break;
			}
		}
	}
	return ballot;
}

function useEpollsInitState() {
	const groupId = useAppSelector(selectTopLevelGroupId)!;
	const { selected, loading, valid } = useAppSelector(selectEpollsState);
	const entities = useAppSelector(selectSyncedEntities);
	const ballotIds = useAppSelector(selectBallotIds);
	const ballotEntities = useAppSelector(selectBallotEntities);

	const initState = React.useCallback((): BallotsEditState => {
		const epolls = selected.map((id) => entities[id]!).filter(Boolean);
		if (loading && !valid) {
			return {
				action: null,
				message: "Loading...",
				ballots: [],
			} satisfies BallotsEditState;
		} else if (epolls.length === 0) {
			return {
				action: null,
				message: "Nothing selected",
				ballots: [],
			} satisfies BallotsEditState;
		} else if (epolls.length === 1) {
			const epoll = epolls[0];
			const ballot = epoll.ballot_id
				? ballotEntities[epoll.ballot_id]
				: undefined;
			if (ballot) {
				const edited = {
					...ballot,
					...ePollToBallot(epoll, groupId, ballotEntities),
				};
				if (
					new Date(edited.Start || "").getTime() ===
					new Date(ballot.Start || "").getTime()
				)
					edited.Start = ballot.Start;
				if (
					new Date(edited.End || "").getTime() ===
					new Date(ballot.End || "").getTime()
				)
					edited.End = ballot.End;
				return {
					action: "update",
					edited,
					saved: edited,
					ballots: [ballot],
				};
			} else {
				const edited = {
					...getDefaultBallot(ballotIds, ballotEntities),
					...ePollToBallot(epoll, groupId, ballotEntities),
				};
				return {
					action: "add",
					edited,
					saved: undefined,
					ballots: [],
				};
			}
		} else {
			return {
				action: null,
				message: "Multiple selected",
				ballots: [],
			} satisfies BallotsEditState;
		}
	}, [selected, entities, loading, valid, ballotIds, ballotEntities]);

	const [state, setState] = React.useState<BallotsEditState>(initState);

	const resetState = React.useCallback(
		() => setState(initState),
		[setState, initState]
	);

	React.useEffect(() => {
		console.log("effect");
		resetState();
	}, [selected, resetState]);

	return {
		state,
		setState,
		resetState,
	};
}

export function useEpollsEdit(readOnly: boolean) {
	const { state, setState, resetState } = useEpollsInitState();

	const { onChange, hasChanges, submit } = useBallotsUpdate(
		readOnly,
		state,
		setState,
		resetState
	);

	return {
		state,
		onChange,
		hasChanges,
		submit,
		cancel: resetState,
	};
}
