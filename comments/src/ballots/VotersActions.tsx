import { Link } from "react-router-dom";
import { ActionButtonDropdown, Row, FieldLeft } from "dot11-components";

import { VotersImportForm } from "../voters/VotersImport";
import { useAppSelector } from "../store/hooks";
import { getBallotId, selectBallotsWorkingGroup, Ballot } from "../store/ballots";

function VotersActions({
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
				<FieldLeft label="Voters:">
					<Link
						to={`/${workingGroup.name}/voters/${getBallotId(ballot)}`}
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

export default VotersActions;
