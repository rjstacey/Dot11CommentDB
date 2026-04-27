import { ButtonGroup, ToggleButton } from "react-bootstrap";
import { useLocation, useNavigate, useNavigation } from "react-router";

export function ToggleAdminView() {
	const location = useLocation();
	const navigate = useNavigate();
	const navigation = useNavigation();

	const isAdmin = location.pathname.endsWith("/admin");
	function setIsAdmin(isAdmin: boolean) {
		let path = location.pathname.replace("/admin", "");
		if (isAdmin) path += "/admin";
		navigate(path);
	}

	return (
		<ButtonGroup className="align-items-center ms-3 me-3">
			<ToggleButton
				type="radio"
				id="toggle-admin"
				value="admin"
				variant={"outline-danger"}
				checked={isAdmin}
				onChange={(e) => setIsAdmin(e.target.checked)}
				disabled={navigation.state === "loading"}
			>
				{"Admin"}
			</ToggleButton>
			<ToggleButton
				type="radio"
				id="toggle-user"
				value="user"
				variant={"outline-success"}
				checked={!isAdmin}
				onChange={(e) => setIsAdmin(!e.target.checked)}
				disabled={navigation.state === "loading"}
			>
				{"User"}
			</ToggleButton>
		</ButtonGroup>
	);
}
