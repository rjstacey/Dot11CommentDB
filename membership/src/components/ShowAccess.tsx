import { Row } from "react-bootstrap";
import { AccessLevel } from "@/store/user";

function renderAccess(access: number) {
	if (access === AccessLevel.admin) return "admin";
	if (access === AccessLevel.rw) return "rw";
	if (access === AccessLevel.ro) return "ro";
	return "none";
}

function ShowAccess({ access }: { access: number }) {
	return (
		<Row className="justify-content-end" style={{ opacity: 0.5 }}>
			{renderAccess(access)}
		</Row>
	);
}

export default ShowAccess;
