import { AccessLevel } from "@/store/user";

function renderAccess(access: number) {
	if (access === AccessLevel.admin) return "admin";
	if (access === AccessLevel.rw) return "rw";
	if (access === AccessLevel.ro) return "ro";
	return "none";
}

function ShowAccess({ access }: { access: number }) {
	return (
		<div className="d-flex justify-content-end" style={{ opacity: 0.5 }}>
			{renderAccess(access)}
		</div>
	);
}

export default ShowAccess;
