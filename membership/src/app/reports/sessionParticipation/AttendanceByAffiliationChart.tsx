import { Ratio } from "react-bootstrap";
import StackedBarChart from "@/components/StackedBarChart";
import { useDimensions } from "../useDimensions";
import {
	useAttendanceByAffiliation,
	series,
} from "./useAttendanceByAffiliation";

export function AttendanceByAffiliationChart() {
	const { ids, entities } = useAttendanceByAffiliation();
	const { ref, width, height } = useDimensions();

	return (
		<Ratio ref={ref} aspectRatio="16x9" className="overflow-hidden">
			<StackedBarChart
				width={width}
				height={height}
				series={series}
				ids={ids}
				entities={entities}
				yLabel="Number of attendees"
			/>
		</Ratio>
	);
}

export default AttendanceByAffiliationChart;
