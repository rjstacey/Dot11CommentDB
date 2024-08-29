import { useNavigate, useParams } from "react-router-dom";

import { ActionButton, Spinner } from "dot11-components";

import { useAppSelector } from "../store/hooks";
import { selectMeetingAttendanceState } from "../store/imatMeetingAttendance";

import CurrentSessionSelector from "../components/CurrentSessionSelector";

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

function copyToClipboard() {
	const svg: SVGSVGElement | null = document.querySelector("#chart");
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

	const svgUrl = URL.createObjectURL(svgBlob);
	const downloadLink = document.createElement("a");
	downloadLink.href = svgUrl;
	downloadLink.download = "chart.svg";
	document.body.appendChild(downloadLink);
	downloadLink.click();
	document.body.removeChild(downloadLink);

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

function ReportsActions() {
	const navigate = useNavigate();
	const { chart } = useParams();
	const { loading } = useAppSelector(selectMeetingAttendanceState);

	const refresh = () => navigate(".");

	return (
		<div className="top-row">
			<CurrentSessionSelector />

			{loading && <Spinner />}

			<div style={{ display: "flex" }}>
				<ActionButton
					name="copy"
					title="Copy chart to clipboard"
					onClick={() => copyToClipboard()}
					disabled={!chart}
				/>
				<ActionButton
					name="refresh"
					title="Refresh"
					onClick={refresh}
				/>
			</div>
		</div>
	);
}

export default ReportsActions;
