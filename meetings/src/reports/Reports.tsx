import React from 'react';
import styled from '@emotion/styled';
import AutoSizer from 'react-virtualized-auto-sizer';

import { ActionButton, Button, Spinner } from 'dot11-components';

import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectCurrentImatMeetingId } from '../store/current';
import {
    loadImatMeetingAttendance,
    clearImatMeetingAttendance,
    selectMeetingAttendanceState,
} from '../store/imatMeetingAttendance';

import CurrentSessionSelector from '../components/CurrentSessionSelector';
import TopRow from '../components/TopRow';
import SessionAttendanceChart from './SessionAttendanceChart';
import TeleconAttendanceChart from './TeleconAttendanceChart';
import { loadBreakouts } from '../store/imatBreakouts';
import { useParams } from 'react-router-dom';

const actions = [
    "sessionAttendance",
    "teleconAttendance"
] as const;

type Action = typeof actions[number];

const chartSelector: { [ K in Action ]: string } = {
    sessionAttendance: "Session attendance",
    teleconAttendance: "Telecon attendance",
}

export type ReportChartProps = {
    className?: string;
    style?: React.CSSProperties;
    svgRef: React.RefObject<SVGSVGElement>;
    height: number;
    width: number;
}

const chartComponent: { [K in Action]: React.FC<ReportChartProps>} = {
    sessionAttendance: SessionAttendanceChart,
    teleconAttendance: TeleconAttendanceChart
}

const ChartWrapper = styled.div`
    width: 80vw;
    flex: 1;
    padding: 20px;
    display: flex;
    overflow: hidden;

    & .chart-select {
        display: flex;
        flex-direction: column;
        padding: 10px;
    }

    & .chart-select button {
        margin: 10px;
    }

    & .chart-draw {
        flex: 1;
    }

    & .chart-draw svg {
        opacity: 1.0;
        transition: opacity 0.1s ease-out;
    }

    & .chart-draw svg.blink {
        opacity: 0.5;
    }
`;

function ReportsNav({
    action,
    setAction
}: {
    action: Action | null;
    setAction: (action: Action | null) => void;
}) {
    function handleAction(newAction: Action) {
        setAction(newAction === action? null: newAction);
    }
    return (
        <div className='chart-select'>
            {actions.map(a =>
                <Button
                    key={a}
                    onClick={() => handleAction(a)}
                    isActive={action === a}
                >
                    {chartSelector[a]}
                </Button>)}
        </div>
    )
}

/**
 * Currently Chrome does not support writing MIME type "image/svg+xml" to the clipboard. So we have to convert
 * from SVG to a PNG and then do the write to the clipboard.
 */
interface F { (svg: SVGSVGElement | null): void; canvas?: HTMLCanvasElement; }
const copyToClipboard2: F = async function(svg) {
    if (!svg)
        return;

    let svgText = svg.outerHTML;
    const {width, height} = svg.getBoundingClientRect();

    if (!svgText.match(/xmlns="/mi))
        svgText = svgText.replace ('<svg ','<svg xmlns="http://www.w3.org/2000/svg" ');
    const svgBlob = new Blob([svgText], {type: "image/svg+xml;charset=utf-8"});
    const domUrl = window.URL || window.webkitURL || window;
    const url = domUrl.createObjectURL(svgBlob);

    const canvas: HTMLCanvasElement = copyToClipboard2.canvas || (copyToClipboard2.canvas = document.createElement("canvas"));
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;

    const loadImage = (url: string) => new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.addEventListener('load', () => resolve(img));
        img.addEventListener('error', reject);
        img.src = url;
    });

    const img = await loadImage(url);
    ctx.drawImage(img, 0, 0);

    canvas.toBlob(function(blob) { 
        const item = new ClipboardItem({ "image/png": blob! });
        navigator.clipboard.write([item])
            .then(() => {
                function removeBlink() {
                    svg!.classList.remove('blink');
                    svg!.removeEventListener("transitionend", removeBlink);
                }
                svg.addEventListener("transitionend", removeBlink);
                svg.classList.add('blink');
            })
            .catch(error => console.error(error.name, error.message))
    });
}

function copyToClipboard(svg: SVGSVGElement | null) {
    if (!svg)
        return;

    let svgText = svg.outerHTML;

    if (!svgText.match(/xmlns="/mi))
        svgText = svgText.replace ('<svg ','<svg xmlns="http://www.w3.org/2000/svg" ');
    const svgBlob = new Blob([svgText], {type: "image/svg+xml;charset=utf-8"});
    const item = new ClipboardItem({ "image/svg+xml": svgBlob });
    navigator.clipboard.write([item])
        .then(() => {
            function removeBlink() {
                svg!.classList.remove('blink');
                svg!.removeEventListener("transitionend", removeBlink);
            }
            svg.addEventListener("transitionend", removeBlink);
            svg.classList.add('blink');
        })
        .catch(error => console.error(error.name, error.message))
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
        <div className='chart-draw'>
            <AutoSizer>
                {({height, width}) => <Component svgRef={svgRef} width={width} height={height} />}
            </AutoSizer>
        </div>
    )
}

function Reports() {
    const dispatch = useAppDispatch();
    const svgRef = React.useRef<SVGSVGElement>(null);
    const {groupName} = useParams();
	const imatMeetingId = useAppSelector(selectCurrentImatMeetingId);
    const {loading} = useAppSelector(selectMeetingAttendanceState);

    const refresh = () => {
        if (groupName && imatMeetingId) {
            dispatch(loadBreakouts(groupName, imatMeetingId));
            dispatch(loadImatMeetingAttendance(groupName, imatMeetingId));
        }
        else {
            dispatch(clearImatMeetingAttendance());
        }
    }

    const [action, setAction] = React.useState<Action | null>(null);

    return (
        <>
            <TopRow>
                <CurrentSessionSelector />

                {loading && <Spinner />}

				<div style={{display: 'flex'}}>
                    <ActionButton
                        name='copy'
                        title='Copy chart to clipboard'
                        onClick={() => copyToClipboard(svgRef.current)}
                        disabled={!action || !svgRef.current}
                    />
					<ActionButton
                        name='refresh'
                        title='Refresh'
                        onClick={refresh}
                    />
				</div>
			</TopRow>
            <ChartWrapper>
                <ReportsNav
                    action={action}
                    setAction={setAction}
                />
                {action &&
                    <ReportsChart
                        action={action}
                        svgRef={svgRef}
                    />}
            </ChartWrapper>
        </>
    )
}

export default Reports;
