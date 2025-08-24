import { saveAs } from "file-saver";
import { Container, Button, NavLink } from "react-bootstrap";

import { useAppSelector } from "@/store/hooks";
import { selectSelectedMembers, Member } from "@/store/members";

function createFile(members: Member[]) {
	const list = members.map((m) => `${m.Email} ${m.Name}`).join("\n");
	const blob = new Blob([list], {
		type: "text/plain;charset=utf-8;",
	});
	saveAs(blob, "bulk.txt");
}

export default function ListServUpdate() {
	const members = useAppSelector(selectSelectedMembers);

	return (
		<Container>
			<p>
				{
					"Use the LISTSERV Bulk Operations feature to add new members to the reflector."
				}
			</p>
			<p>
				{
					'Export the selected members as a text file. Each line has "[Email address] [Full name]".'
				}
			</p>
			<Button
				variant="primary"
				onClick={() => createFile(members)}
				className="mb-3"
			>
				Export list of selected members
			</Button>
			<p>
				{
					"Then use the link below to go to the LISTSERV Bulk Operations and perform the update."
				}
			</p>
			<NavLink
				target="_blank"
				rel="noopener noreferrer"
				href="https://listserv.ieee.org/cgi-bin/wa?BULKOP1=STDS-802-11"
				style={{ textDecoration: "underline" }}
			>
				ieee.listserv.org - Bulk Operations
			</NavLink>
		</Container>
	);
}
