import { AppTable } from "dot11-components";
import {
	imatMeetingsSelectors,
	imatMeetingsActions,
} from "@/store/imatMeetings";
import { tableColumns, defaultTablesConfig } from "./tableColumns";

function ImatMeetingsTable() {
	return (
		<div className="table-container centered-rows">
			<AppTable
				fixed
				columns={tableColumns}
				headerHeight={44}
				estimatedRowHeight={44}
				selectors={imatMeetingsSelectors}
				actions={imatMeetingsActions}
				defaultTablesConfig={defaultTablesConfig}
			/>
		</div>
	);
}

export default ImatMeetingsTable;
