import React from "react";
import { useParams } from "react-router-dom";
import AutoSizer from "react-virtualized-auto-sizer";

import SessionAttendanceChart from "./SessionAttendanceChart";
import TeleconAttendanceChart from "./TeleconAttendanceChart";

export type ReportChartProps = React.SVGProps<SVGSVGElement> & {
	width: number;
	height: number;
};

function ReportsChart() {
	const { chart } = useParams();
	let Chart: React.FunctionComponent<ReportChartProps>;
	if (chart === "sessionAttendance") Chart = SessionAttendanceChart;
	else if (chart === "teleconAttendance") Chart = TeleconAttendanceChart;
	else return null;

	return (
		<div className="chart-draw">
			<AutoSizer>
				{({ height, width }: { height: number; width: number }) => {
					// Rescale to create 16:9
					if ((16 / 9) * height > width) height = (9 * width) / 16;
					else width = (16 * height) / 9;
					return <Chart width={width} height={height} id="chart" />;
				}}
			</AutoSizer>
		</div>
	);
}

export default ReportsChart;
