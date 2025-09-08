import React from "react";
import { useAppSelector } from "@/store/hooks";
import { VoterCreate, selectVotersBallot_id } from "@/store/voters";
import { BallotType, selectBallot } from "@/store/ballots";

import VotersActions from "./actions";
import VotersTable from "./table";
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
			<VotersActions setVotersState={setEditVoter} />
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
