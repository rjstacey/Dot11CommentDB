import React from "react";
import { Outlet } from "react-router";
import { VoterCreate } from "@/store/voters";
import ProjectBallotSelector from "@/components/ProjectBallotSelector";

import VotersActions from "./actions";
import VoterEditModal from "./VoterEdit";

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
	const [editVoter, setEditVoter] = React.useState<VotersState>({
		action: null,
		voter: getDefaultVoter(0),
	});

	return (
		<>
			<div className="top-row">
				<ProjectBallotSelector />
				<VotersActions setVotersState={setEditVoter} />
			</div>
			<Outlet
				context={
					{ setVotersState: setEditVoter } satisfies VotersContext
				}
			/>
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
