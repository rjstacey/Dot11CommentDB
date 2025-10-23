import { Outlet } from "react-router";
import { Container } from "react-bootstrap";
import { useAppSelector } from "../store/hooks";
import { selectUser } from "@/store";
import WorkingGroupSelector from "./WorkingGroupSelector";

function Root() {
	const user = useAppSelector(selectUser);
	let mainEl: JSX.Element | undefined;
	if (!user.SAPIN) {
		mainEl = (
			<>
				<p>
					If you are a member of IEEE 802 or one of its subgroups,
					then sign in using your IEEE credentials.
				</p>
			</>
		);
	} else {
		mainEl = (
			<>
				<h2>Select a working group/committee</h2>
				<WorkingGroupSelector />
			</>
		);
	}
	return (
		<>
			<Container as="section">{mainEl}</Container>
			<Outlet />
		</>
	);
}

export default Root;
