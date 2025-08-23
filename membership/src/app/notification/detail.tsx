import { Tabs, Tab } from "react-bootstrap";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { setUiProperties, selectUiProperties } from "@/store/members";

import NotificationEmail from "./NotificationEmail";
import ListServUpdate from "./ListServUpdate";

export function NotificationDetail() {
	const dispatch = useAppDispatch();
	const tabIndex: string =
		useAppSelector(selectUiProperties).notificationTabIndex || "send-email";
	const setTabIndex = (tabIndex: string | null) => {
		dispatch(setUiProperties({ notificationTabIndex: tabIndex }));
	};

	return (
		<Tabs onSelect={setTabIndex} activeKey={tabIndex}>
			<Tab eventKey="send-email" title="Send Email">
				<NotificationEmail />
			</Tab>
			<Tab eventKey="listserv-update" title="ListServ Update">
				<ListServUpdate />
			</Tab>
		</Tabs>
	);
}
