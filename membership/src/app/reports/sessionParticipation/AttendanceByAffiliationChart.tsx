import StackedBarChart from "@/components/StackedBarChart";
import {
	useAttendanceByAffiliation,
	series,
} from "./useAttendanceByAffiliation";
import { ChartWrapper } from "../ChartWrapper";

export function AttendanceByAffiliationChart() {
	const { ids, entities } = useAttendanceByAffiliation();

	return (
		<ChartWrapper>
			{({ width, height }) => (
				<StackedBarChart
					width={width}
					height={height}
					series={series}
					ids={ids}
					entities={entities}
					yLabel="Number of attendees"
				/>
			)}
		</ChartWrapper>
	);
}

export default AttendanceByAffiliationChart;
