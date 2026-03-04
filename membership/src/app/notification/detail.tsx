import { lazy, Suspense } from "react";
import { Tabs, Tab } from "react-bootstrap";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { setUiProperties, selectUiProperties } from "@/store/members";
import ListServUpdate from "./ListServUpdate";

const NotificationEmail = lazy(() => import("./NotificationEmail"));
//import NotificationEmail from "./NotificationEmail";

export function NotificationDetail() {
	const dispatch = useAppDispatch();
	const tabIndex: string =
		useAppSelector(selectUiProperties).notificationTabIndex || "send-email";
	const setTabIndex = (tabIndex: string | null) => {
		dispatch(setUiProperties({ notificationTabIndex: tabIndex }));
	};

	return (
		<>
			<style>{`
				.tab-content {
					display: flex;
					flex-grow: 1;
					overflow: hidden;
				}
				.tab-content>.active {
					display: flex;
				}
				.tab-pane {
					flex-direction: column;
					flex-grow: 1;
					overflow: hidden;
				}
			`}</style>
			<Tabs onSelect={setTabIndex} activeKey={tabIndex}>
				<Tab eventKey="send-email" title="Send Email">
					<Suspense fallback={<div>Loading...</div>}>
						<NotificationEmail />
					</Suspense>
				</Tab>
				<Tab eventKey="listserv-update" title="ListServ Update">
					<ListServUpdate />
				</Tab>
			</Tabs>
		</>
	);
}
