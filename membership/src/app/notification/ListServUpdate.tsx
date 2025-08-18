import { saveAs } from "file-saver";
import { Button } from "dot11-components";

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
		<>
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
			<Button onClick={() => createFile(members)}>
				Export list of selected members
			</Button>
			<p>
				{
					"Then use the link below to go to the LISTSERV Bulk Operations and perform the update."
				}
			</p>
			<a
				target="_blank"
				rel="noopener noreferrer"
				href="https://listserv.ieee.org/cgi-bin/wa?BULKOP1=STDS-802-11"
			>
				ieee.listserv.org bulk operations
			</a>
		</>
	);
}
