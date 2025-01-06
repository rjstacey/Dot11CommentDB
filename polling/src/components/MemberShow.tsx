import { useAppSelector } from "@/store/hooks";
import { selectMember } from "@/store/members";

function MemberShow({ sapin }: { sapin: number | null }) {
	const member = useAppSelector((state) =>
		sapin ? selectMember(state, sapin) : undefined
	);

	return <div>{member?.Name || "(Blank)"}</div>;
}

export default MemberShow;
