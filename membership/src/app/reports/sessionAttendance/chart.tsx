import { useAppSelector } from "@/store/hooks";
import StackedBarChart from "@/components/StackedBarChart";
import {
	selectAttendeesByAffiliation,
	series,
} from "./selectAttendeesByAffiliation";
import { ChartWrapper } from "../ChartWrapper";

export function SessionAttendanceChart() {
	const { ids, entities } = useAppSelector(selectAttendeesByAffiliation);
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

export default SessionAttendanceChart;
