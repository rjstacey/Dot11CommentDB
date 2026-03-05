import { ChartActions } from "../ChartActions";
import { MembershipOverTimeChart } from "./chart";

export default function MembershipOverTimeReport() {
	return (
		<>
			<div className="d-flex w-100">
				<ChartActions />
			</div>
			<MembershipOverTimeChart />
		</>
	);
}
