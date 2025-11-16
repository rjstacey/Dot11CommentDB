import { Ratio } from "react-bootstrap";
import { useAppSelector } from "@/store/hooks";
import StackedBarChart from "@/components/StackedBarChart";
import { useDimensions } from "../useDimensions";
import {
	selectAttendeesByAffiliation,
	series,
} from "./selectAttendeesByAffiliation";

export function SessionAttendanceChart() {
	const { ids, entities } = useAppSelector(selectAttendeesByAffiliation);
	const { ref, width, height } = useDimensions();

	return (
		<Ratio ref={ref} aspectRatio="16x9" className="overflow-hidden m-3">
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

export default SessionAttendanceChart;
