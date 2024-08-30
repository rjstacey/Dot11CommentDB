import { useLoaderData } from "react-router-dom";
import { LoaderData } from "./route";
import MeetingsActions from "./actions";
import MeetingsTable from "./table";

function MeetingsLayout() {
	const session = useLoaderData() as LoaderData;
	return (
		<>
			<MeetingsActions />
			{session && <MeetingsTable />}
		</>
	);
}

export default MeetingsLayout;
