import { Row, Col } from "react-bootstrap";
import { AccessLevel } from "@/store/groups";

function renderAccess(access: number) {
	if (access === AccessLevel.admin) return "admin";
	if (access === AccessLevel.rw) return "rw";
	if (access === AccessLevel.ro) return "ro";
	return "none";
}

function ShowAccess({ access }: { access: number }) {
	return (
		<Row>
			<Col
				style={{ opacity: 0.5 }}
				className="d-flex justify-content-end"
			>
				{renderAccess(access)}
			</Col>
		</Row>
	);
}

export default ShowAccess;
