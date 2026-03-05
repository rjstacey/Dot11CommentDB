import { useAppSelector } from "@/store/hooks";
import StackedBarChart from "@/components/StackedBarChart";
import {
	selectMembersByAffiliation,
	series,
} from "./selectMembersByAffiliation";
import { ChartWrapper } from "../ChartWrapper";

export function MembersChart() {
	const { ids, entities } = useAppSelector(selectMembersByAffiliation);

	return (
		<ChartWrapper>
			{({ width, height }) => (
				<StackedBarChart
					width={width}
					height={height}
					series={series}
					ids={ids}
					entities={entities}
					yLabel="Number of members"
				/>
			)}
		</ChartWrapper>
	);
}

export default MembersChart;
