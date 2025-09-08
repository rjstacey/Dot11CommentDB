import { Link } from "react-router";
import { Row, Form, Dropdown } from "react-bootstrap";
import { VotersImportForm } from "../voters/VotersImport";
import { useAppSelector } from "@/store/hooks";
import {
	getBallotId,
	selectBallotsWorkingGroup,
	Ballot,
} from "@/store/ballots";
import React from "react";

function VotersActions({
	ballot,
	readOnly,
}: {
	ballot: Ballot;
	readOnly?: boolean;
}) {
	const [show, setShow] = React.useState(false);
	const workingGroup = useAppSelector(selectBallotsWorkingGroup)!;

	return (
		<>
			<Row>
				<Form.Label>Voters:</Form.Label>
				<Link
					to={`/${workingGroup.name}/voters/${getBallotId(ballot)}`}
				>
					{ballot.Voters}
				</Link>
			</Row>
			{!readOnly && (
				<Row style={{ justifyContent: "flex-start" }}>
					<Dropdown show={show} onSelect={() => setShow(!show)}>
						<Dropdown.Toggle>
							{ballot.Voters ? "Reimport" : "Import"}
						</Dropdown.Toggle>
						<Dropdown.Menu>
							<VotersImportForm
								ballot={ballot}
								close={() => setShow(false)}
							/>
						</Dropdown.Menu>
					</Dropdown>
				</Row>
			)}
		</>
	);
}

export default VotersActions;
