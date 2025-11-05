import { Ratio } from "react-bootstrap";
import { useAppSelector } from "@/store/hooks";
import StackedBarChart from "@/components/StackedBarChart";
import { useDimensions } from "../useDimensions";
import {
	selectMembersByAffiliation,
	series,
} from "./selectMembersByAffiliation";

export function MembersChart() {
	const { ids, entities } = useAppSelector(selectMembersByAffiliation);
	const { ref, width, height } = useDimensions();

	return (
		<Ratio ref={ref} aspectRatio="16x9" className="overflow-hidden">
			<StackedBarChart
				width={width}
				height={height}
				series={series}
				ids={ids}
				entities={entities}
				yLabel="Number of members"
			/>
		</Ratio>
	);
}

export default MembersChart;
