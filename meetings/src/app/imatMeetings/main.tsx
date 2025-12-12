import { AppTable } from "@common";
import {
	imatMeetingsSelectors,
	imatMeetingsActions,
} from "@/store/imatMeetings";
import { tableColumns, defaultTablesConfig } from "./tableColumns";

export function ImatMeetingsMain() {
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
