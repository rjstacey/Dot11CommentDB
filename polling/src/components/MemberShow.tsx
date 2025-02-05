import { useAppSelector } from "@/store/hooks";
import { selectMember } from "@/store/members";

function MemberShow({
	sapin,
	...props
}: { sapin: number | null } & React.ComponentProps<"span">) {
	const member = useAppSelector((state) =>
		sapin ? selectMember(state, sapin) : undefined
	);

	return <span {...props}>{member?.Name || "(Blank)"}</span>;
}

export default MemberShow;
