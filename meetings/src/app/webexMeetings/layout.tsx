import { useLoaderData } from "react-router";
import { LoaderData } from "./route";
import WebexMeetingsActions from "./actions";
import WebexMeetingsTable from "./table";

function WebexMeetingsLayout() {
	const session = useLoaderData() as LoaderData;
	return (
		<>
			<WebexMeetingsActions />
			{session && <WebexMeetingsTable />}
		</>
	);
}

export default WebexMeetingsLayout;
