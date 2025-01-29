import React from "react";
import { useAppSelector } from "@/store/hooks";
import { VoterCreate, selectVotersBallot_id } from "@/store/voters";
import { BallotType, selectBallot } from "@/store/ballots";
import ProjectBallotSelector from "@/components/ProjectBallotSelector";

import VotersActions from "./actions";
import VotersTable from "./table";
import VoterEditModal from "./VoterEdit";

function InitialBallot() {
	const id = useAppSelector(selectVotersBallot_id);
	const b = useAppSelector((state) =>
		id ? selectBallot(state, id) : undefined
	);
	const descr =
		b?.Type === BallotType.WG
			? `${b.BallotID} on ${b.Document}`
			: "This is not a WG ballot";

	return (
		<div style={{ display: "flex", flexDirection: "column" }}>
			<span>Voting poll formed with WG initial ballot</span>
			<span>{descr}</span>
		</div>
	);
}

export function getDefaultVoter(ballot_id: number): VoterCreate {
	return {
		ballot_id,
		SAPIN: 0,
		Status: "Voter",
	} satisfies VoterCreate;
}

type VotersState = {
	action: "add" | "update" | null;
	voter: VoterCreate;
};

export type VotersContext = { setVotersState: (state: VotersState) => void };

function VotersLayout() {
	const id = useAppSelector(selectVotersBallot_id);
	const b = useAppSelector((state) =>
		id ? selectBallot(state, id) : undefined
	);

	const [editVoter, setEditVoter] = React.useState<VotersState>({
		action: null,
		voter: getDefaultVoter(0),
	});

	return (
		<>
			<div className="top-row">
				<ProjectBallotSelector />
				<InitialBallot />
				<VotersActions setVotersState={setEditVoter} />
			</div>
			{b?.Type === BallotType.WG ? (
				<div className="table-container centered-rows">
					<VotersTable setVotersState={setEditVoter} />
				</div>
			) : (
				<div
					className="table-container"
					style={{ justifyContent: "center" }}
				>
					<span>No voting pool</span>
				</div>
			)}
			<VoterEditModal
				isOpen={Boolean(editVoter.action)}
				close={() =>
					setEditVoter((state) => ({ ...state, action: null }))
				}
				voter={editVoter.voter}
				action={editVoter.action}
			/>
		</>
	);
}

export default VotersLayout;
