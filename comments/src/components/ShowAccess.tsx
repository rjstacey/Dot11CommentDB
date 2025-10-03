import { AccessLevel } from "@/store/user";

function renderAccess(access: number) {
	if (access === AccessLevel.admin) return "admin";
	if (access === AccessLevel.rw) return "rw";
	if (access === AccessLevel.ro) return "ro";
	return "none";
}

export function ShowAccess({ access }: { access: number | number[] }) {
	let s: string;
	if (Array.isArray(access)) {
		s = access.map((a) => renderAccess(a)).join(" / ");
	} else {
		s = renderAccess(access);
	}
	return (
		<div className="d-flex justify-content-end" style={{ opacity: 0.5 }}>
			{s}
		</div>
	);
}

export default ShowAccess;
