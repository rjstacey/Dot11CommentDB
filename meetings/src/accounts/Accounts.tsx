import CalendarAccounts from './CalendarAccounts';
import WebexAccounts from './WebexAccounts';

function Accounts() {
	return (
		<div style={{padding: 10, overflow: 'auto'}}>
			<WebexAccounts />
			<CalendarAccounts />
		</div>
	)
}

export default Accounts;