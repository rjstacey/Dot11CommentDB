import CalendarAccounts from "./CalendarAccounts";
import WebexAccounts from "./WebexAccounts";
import styles from "./accounts.module.css";

function AccountsLayout() {
	return (
		<div className={styles.container}>
			<WebexAccounts />
			<CalendarAccounts />
		</div>
	);
}

export default AccountsLayout;
