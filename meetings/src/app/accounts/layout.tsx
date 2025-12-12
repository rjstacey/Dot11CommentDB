import { CalendarAccounts } from "./CalendarAccounts";
import { WebexAccounts } from "./WebexAccounts";

export function AccountsLayout() {
	return (
		<>
			<WebexAccounts />
			<CalendarAccounts />
		</>
	);
}
