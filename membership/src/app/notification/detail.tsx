import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import "react-tabs/style/react-tabs.css";

import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { setUiProperties, selectUiProperties } from "@/store/members";

import NotificationEmail from "./NotificationEmail";
import ListServUpdate from "./ListServUpdate";

export function NotificationDetail() {
	const dispatch = useAppDispatch();
	const tabIndex: number =
		useAppSelector(selectUiProperties).notificationTabIndex || 0;
	const setTabIndex = (tabIndex: number) => {
		dispatch(setUiProperties({ notificationTabIndex: tabIndex }));
	};

	return (
		<Tabs
			style={{ width: "100%" }}
			onSelect={setTabIndex}
			selectedIndex={tabIndex}
		>
			<TabList>
				<Tab>Send Email</Tab>
				<Tab>ListServ Update</Tab>
			</TabList>
			<TabPanel>
				<NotificationEmail />
			</TabPanel>
			<TabPanel>
				<ListServUpdate />
			</TabPanel>
		</Tabs>
	);
}
