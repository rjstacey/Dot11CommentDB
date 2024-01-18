import { Link } from "react-router-dom";
import { ActionButtonDropdown, Row, FieldLeft } from "dot11-components";

import { VotersImportForm } from "../ballotVoters/VotersImport";
import { useAppSelector } from "../store/hooks";
import { selectBallotsWorkingGroup, selectBallot } from "../store/ballots";

function VoterPoolActions({
	ballot_id,
	readOnly,
}: {
	ballot_id: number;
	readOnly?: boolean;
}) {
	const workingGroup = useAppSelector(selectBallotsWorkingGroup)!;
	const ballot = useAppSelector((state) => selectBallot(state, ballot_id));

	return (
		<>
			<Row>
				<FieldLeft label="Voter pool:">
					<Link
						to={`/${workingGroup.name}/voters/${ballot.BallotID}`}
					>
						{ballot.Voters}
					</Link>
				</FieldLeft>
			</Row>
			{!readOnly && (
				<Row style={{ justifyContent: "flex-start" }}>
					<ActionButtonDropdown
						label={ballot.Voters ? "Reimport" : "Import"}
						title="Import voters"
						portal={document.querySelector("#root")}
						dropdownPosition="top"
						dropdownRenderer={({ methods }) => (
							<VotersImportForm
								ballot={ballot}
								close={methods.close}
							/>
						)}
					/>
				</Row>
			)}
		</>
	);
}

export default VoterPoolActions;
