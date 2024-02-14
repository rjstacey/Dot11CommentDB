import { Row, Field, isMultiple } from "dot11-components";

import type { Member } from "../store/members";
import type { MultipleMember } from "./MemberEdit";

import AccessSelector from "./AccessSelector";

const BLANK_STR = "(Blank)";
const MULTIPLE_STR = "(Multiple)";

function MemberPermissions({
	member,
	updateMember,
	readOnly,
}: {
	member: MultipleMember;
	updateMember: (changes: Partial<Member>) => void;
	readOnly?: boolean;
}) {
	return (
		<Row>
			<Field label="Access:">
				<AccessSelector
					style={{ flexBasis: 200 }}
					value={isMultiple(member.Access) ? 0 : member.Access}
					onChange={(value) => updateMember({ Access: value })}
					placeholder={
						isMultiple(member.Access) ? MULTIPLE_STR : BLANK_STR
					}
					readOnly={readOnly}
				/>
			</Field>
		</Row>
	);
}

export default MemberPermissions;
