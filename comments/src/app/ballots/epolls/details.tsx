import React from "react";
import { Dictionary } from "@reduxjs/toolkit";
import { Container, Row, Col, Spinner } from "react-bootstrap";
import { useAppSelector } from "@/store/hooks";
import { selectIsOnline } from "@/store/offline";
import { selectTopLevelGroupId } from "@/store/groups";
import {
	selectEpollsState,
	selectSyncedEntities,
	SyncedEpoll,
} from "@/store/epolls";
import {
	BallotType,
	Ballot,
	selectBallotEntities,
	selectBallotsAccess,
} from "@/store/ballots";
import { AccessLevel } from "@/store/user";

import ShowAccess from "@/components/ShowAccess";
import { BallotAddForm } from "../BallotAddForm";
import { BallotEditForm } from "../BallotEditForm";

const defaultBallot: Ballot = {
	groupId: "",
	number: 0,
	stage: 0,
	Project: "",
	Type: BallotType.CC,
	EpollNum: null,
	Start: null,
	End: null,
	Document: "",
	Topic: "",
	prev_id: null,
	IsComplete: false,

	id: 0,
	Voters: 0,
	Comments: { Count: 0, CommentIDMax: 0, CommentIDMin: 0 },
	Results: null,
	workingGroupId: "",
	BallotID: "",
};

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

const Placeholder = (props: React.ComponentProps<"span">) => (
	<div className="details-panel-placeholder">
		<span {...props} />
	</div>
);

export function EpollsDetail() {
	const isOnline = useAppSelector(selectIsOnline);
	const access = useAppSelector(selectBallotsAccess);
	const readOnly = access < AccessLevel.admin;
	const groupId = useAppSelector(selectTopLevelGroupId)!;
	const { selected, loading } = useAppSelector(selectEpollsState);
	const entities = useAppSelector(selectSyncedEntities);
	const ballotEntities = useAppSelector(selectBallotEntities);
	const selectedEpolls = React.useMemo(
		() => selected.map((id) => entities[id]!).filter((b) => Boolean(b)),
		[selected, entities]
	);
	const [ballotToEdit, ballots] = React.useMemo(() => {
		if (selectedEpolls.length === 1 && selectedEpolls[0].ballot_id) {
			const ballot = ballotEntities[selectedEpolls[0].ballot_id!];
			if (ballot) {
				const toEdit = {
					...ballot,
					...ePollToBallot(
						selectedEpolls[0],
						groupId,
						ballotEntities
					),
				};
				if (
					new Date(toEdit.Start || "").getTime() ===
					new Date(ballot.Start || "").getTime()
				)
					toEdit.Start = ballot.Start;
				if (
					new Date(toEdit.End || "").getTime() ===
					new Date(ballot.End || "").getTime()
				)
					toEdit.End = ballot.End;
				return [toEdit, [ballot]];
			}
		}
		return [null, []];
	}, [selectedEpolls, groupId, ballotEntities]);
	const ballotToAdd = React.useMemo(() => {
		if (selectedEpolls.length === 1 && !selectedEpolls[0].ballot_id) {
			return {
				...defaultBallot,
				...ePollToBallot(selectedEpolls[0], groupId, ballotEntities),
			};
		}
		return null;
	}, [selectedEpolls, groupId, ballotEntities]);
	const [busy, setBusy] = React.useState(false);

	let content: JSX.Element;
	if (ballotToEdit) {
		content = (
			<BallotEditForm
				ballots={ballots}
				defaultEdited={ballotToEdit}
				setBusy={setBusy}
				readOnly={readOnly || !isOnline}
			/>
		);
	} else if (ballotToAdd) {
		content = (
			<BallotAddForm
				defaultBallot={ballotToAdd}
				setBusy={setBusy}
				readOnly={readOnly || !isOnline}
			/>
		);
	} else {
		let placeholder: string;
		if (loading) {
			placeholder = "Loading...";
		} else if (selectedEpolls.length === 0) {
			placeholder = "Nothing selected";
		} else if (selectedEpolls.length > 1) {
			placeholder = "Multiple selected";
		} else {
			placeholder = "Unexpected";
		}
		content = <Placeholder>{placeholder}</Placeholder>;
	}

	return (
		<Container fluid style={{ maxWidth: 860 }}>
			<Row className="align-items-center mb-2">
				<Col>
					<Spinner
						size="sm"
						className={busy ? "visible" : "invisible"}
					/>
				</Col>
			</Row>
			{content}
			<ShowAccess access={access} />
		</Container>
	);
}
