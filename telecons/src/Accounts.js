import React from 'react'
import CalendarAccounts from './CalendarAccounts'
import WebexAccounts from './WebexAccounts'

function Accounts() {
	return (
		<div style={{width: 1000}}>
			<WebexAccounts />
			<CalendarAccounts />
		</div>
	)
}

export default Accounts;