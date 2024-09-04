import React from "react";
import { useAppSelector } from "../store/hooks";
import { selectVotersBallot_id, VoterCreate } from "../store/voters";
import ProjectBallotSelector from "../components/ProjectBallotSelector";

import VotersActions from "./actions";
import VotersTable from "./table";
import VoterEditModal from "./VoterEdit";

function getDefaultVoter(ballot_id: number): VoterCreate {
	let voter: VoterCreate = {
		ballot_id,
		SAPIN: 0,
		Status: "Voter",
	};
	return voter;
}

type VotersState = {
	action: "add" | "update" | null;
	voter: VoterCreate;
};

export type SetVotersState = (state: VotersState) => void;

function VotersLayout() {
	const votersBallot_id = useAppSelector(selectVotersBallot_id);

	const [editVoter, setEditVoter] = React.useState<VotersState>({
		action: null,
		voter: getDefaultVoter(votersBallot_id || 0),
	});

	return (
		<>
			<div className="top-row">
				<ProjectBallotSelector />
				<VotersActions setVotersState={setEditVoter} />
			</div>
			{votersBallot_id && <VotersTable setVotersState={setEditVoter} />}
			<VoterEditModal
				isOpen={Boolean(editVoter.action)}
				close={() =>
					setEditVoter((state) => ({ ...state, action: null }))
				}
				ballot_id={votersBallot_id}
				voter={editVoter.voter}
				action={editVoter.action}
			/>
		</>
	);
}

export default VotersLayout;
