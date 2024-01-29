import { Link } from "react-router-dom";
import { ActionButtonDropdown, Row, FieldLeft } from "dot11-components";

import { VotersImportForm } from "../ballotVoters/VotersImport";
import { useAppSelector } from "../store/hooks";
import { selectBallotsWorkingGroup, Ballot } from "../store/ballots";

function VoterPoolActions({
	ballot,
	readOnly,
}: {
	ballot: Ballot;
	readOnly?: boolean;
}) {
	const workingGroup = useAppSelector(selectBallotsWorkingGroup)!;

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
						portal={document.querySelector("#root")!}
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
