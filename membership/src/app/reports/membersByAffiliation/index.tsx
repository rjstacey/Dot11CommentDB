import { ChartActions } from "../ChartActions";
import { MembersChart } from "./chart";

export default function MembersReport() {
	return (
		<>
			<div className="d-flex w-100">
				<ChartActions />
			</div>
			<MembersChart />
		</>
	);
}
