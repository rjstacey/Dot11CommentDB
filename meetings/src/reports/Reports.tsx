import React from "react";
import { useParams } from "react-router-dom";
import AutoSizer from "react-virtualized-auto-sizer";

import { ActionButton, Button, Spinner } from "dot11-components";

import { useAppDispatch, useAppSelector } from "../store/hooks";
import { selectCurrentImatMeeting } from "../store/imatMeetings";
import {
	loadImatMeetingAttendance,
	clearImatMeetingAttendance,
	selectMeetingAttendanceState,
} from "../store/imatMeetingAttendance";

import CurrentSessionSelector from "../components/CurrentSessionSelector";
import TopRow from "../components/TopRow";
import SessionAttendanceChart from "./SessionAttendanceChart";
import TeleconAttendanceChart from "./TeleconAttendanceChart";
import { loadBreakouts } from "../store/imatBreakouts";

import styles from "./Reports.module.css";

const actions = ["sessionAttendance", "teleconAttendance"] as const;

type Action = (typeof actions)[number];

const chartSelector: { [K in Action]: string } = {
	sessionAttendance: "Session attendance",
	teleconAttendance: "Telecon attendance",
};

export type ReportChartProps = {
	className?: string;
	style?: React.CSSProperties;
	svgRef: React.RefObject<SVGSVGElement>;
	height: number;
	width: number;
};

const chartComponent: { [K in Action]: React.FC<ReportChartProps> } = {
	sessionAttendance: SessionAttendanceChart,
	teleconAttendance: TeleconAttendanceChart,
};

function ReportsNav({
	action,
	setAction,
}: {
	action: Action | null;
	setAction: (action: Action | null) => void;
}) {
	function handleAction(newAction: Action) {
		setAction(newAction === action ? null : newAction);
	}
	return (
		<div className="chart-select">
			{actions.map((a) => (
				<Button
					key={a}
					onClick={() => handleAction(a)}
					isActive={action === a}
				>
					{chartSelector[a]}
				</Button>
			))}
		</div>
	);
}

function blinkElement(el: Element) {
	function removeBlink() {
		el!.classList.remove("blink");
		el!.removeEventListener("transitionend", removeBlink);
	}
	el.addEventListener("transitionend", removeBlink);
	el.classList.add("blink");
}

/**
 * Currently Chrome does not support writing MIME type "image/svg+xml" to the clipboard. So we have to convert
 * from SVG to a PNG and then do the write to the clipboard.
 */
interface F {
	(svg: SVGSVGElement | null): Promise<Blob | null | undefined>;
	canvas?: HTMLCanvasElement;
}
const svgToPngBlob: F = async function (svg) {
	if (!svg) return;

	let svgText = svg.outerHTML;
	const { width, height } = svg.getBoundingClientRect();

	if (!svgText.match(/xmlns="/im))
		svgText = svgText.replace(
			"<svg ",
			'<svg xmlns="http://www.w3.org/2000/svg" '
		);
	const svgBlob = new Blob([svgText], {
		type: "image/svg+xml;charset=utf-8",
	});
	const domUrl = window.URL || window.webkitURL || window;
	const url = domUrl.createObjectURL(svgBlob);

	const canvas: HTMLCanvasElement =
		svgToPngBlob.canvas ||
		(svgToPngBlob.canvas = document.createElement("canvas"));
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext("2d")!;

	const loadImage = (url: string) =>
		new Promise<HTMLImageElement>((resolve, reject) => {
			const img = new Image();
			img.addEventListener("load", () => resolve(img));
			img.addEventListener("error", reject);
			img.src = url;
		});

	const img = await loadImage(url);
	ctx.drawImage(img, 0, 0);

	return new Promise((resolve) => {
		canvas.toBlob(function (blob) {
			resolve(blob);
		});
	});
};

function copyToClipboard(svg: SVGSVGElement | null) {
	if (!svg) return;

	let svgText = svg.outerHTML;

	if (!svgText.match(/xmlns="/im))
		svgText = svgText.replace(
			"<svg ",
			'<svg xmlns="http://www.w3.org/2000/svg" '
		);
	const svgBlob = new Blob([svgText], {
		type: "image/svg+xml;charset=utf-8",
	});
	const item = new ClipboardItem({ "image/svg+xml": svgBlob });
	navigator.clipboard
		.write([item])
		.then(() => blinkElement(svg))
		.catch((error) => {
			svgToPngBlob(svg).then((blob) => {
				const item = new ClipboardItem({ "image/png": blob! });
				navigator.clipboard
					.write([item])
					.then(() => blinkElement(svg))
					.catch((error) => console.warn(error));
			});
		});
}

function ReportsChart({
	action,
	svgRef,
}: {
	action: Action;
	svgRef: React.RefObject<SVGSVGElement>;
}) {
	const Component = chartComponent[action];

	return (
		<div className="chart-draw">
			<AutoSizer>
				{({ height, width }: { height: number; width: number }) => (
					<Component svgRef={svgRef} width={width} height={height} />
				)}
			</AutoSizer>
		</div>
	);
}

function Reports() {
	const dispatch = useAppDispatch();
	const svgRef = React.useRef<SVGSVGElement>(null);
	const { groupName } = useParams();
	const imatMeeting = useAppSelector(selectCurrentImatMeeting);
	const { loading } = useAppSelector(selectMeetingAttendanceState);

	const refresh = () => {
		if (groupName && imatMeeting) {
			dispatch(loadBreakouts(groupName, imatMeeting.id));
			dispatch(loadImatMeetingAttendance(groupName, imatMeeting.id));
		} else {
			dispatch(clearImatMeetingAttendance());
		}
		setAction(
			imatMeeting.type === "Other"
				? "teleconAttendance"
				: "sessionAttendance"
		);
	};

	React.useEffect(refresh, [groupName, imatMeeting, dispatch]);

	const [action, setAction] = React.useState<Action | null>(null);

	return (
		<>
			<TopRow>
				<CurrentSessionSelector />

				{loading && <Spinner />}

				<div style={{ display: "flex" }}>
					<ActionButton
						name="copy"
						title="Copy chart to clipboard"
						onClick={() => copyToClipboard(svgRef.current)}
						disabled={!action || !svgRef.current}
					/>
					<ActionButton
						name="refresh"
						title="Refresh"
						onClick={refresh}
					/>
				</div>
			</TopRow>
			3<div
				className={styles.main}
			>
				<ReportsNav action={action} setAction={setAction} />
				{action && <ReportsChart action={action} svgRef={svgRef} />}
			</div>
		</>
	);
}

export default Reports;
