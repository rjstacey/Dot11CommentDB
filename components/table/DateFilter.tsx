import { useDispatch, useSelector } from "react-redux";
import { Form, Row, Col } from "react-bootstrap";
import {
	FilterComp,
	AppTableDataSelectors,
	AppTableDataActions,
	CompOp,
} from "../store/appTableData";

export function DateFilter({
	dataKey,
	selectors,
	actions,
}: {
	dataKey: string;
	selectors: AppTableDataSelectors;
	actions: AppTableDataActions;
}) {
	const dispatch = useDispatch();

	const beforeDate = useSelector((state: any) => {
		const filter = selectors.selectFilter(state, dataKey);
		return filter.comps.find((c) => c.operation === CompOp.LT)?.value || "";
	});

	const afterDate = useSelector((state: any) => {
		const filter = selectors.selectFilter(state, dataKey);
		return filter.comps.find((c) => c.operation === CompOp.GT)?.value || "";
	});

	const setBefore = (date: string) => {
		const comps: FilterComp[] = date
			? [{ value: date, operation: CompOp.LT }]
			: [];
		dispatch(actions.setFilter({ dataKey, comps }));
	};

	const setAfter = (date: string) => {
		const comps: FilterComp[] = date
			? [{ value: date, operation: CompOp.GT }]
			: [];
		dispatch(actions.setFilter({ dataKey, comps }));
	};

	return (
		<>
			<Form.Group as={Row} className="mb-2" controlId="before-date">
				<Form.Label column>Before:</Form.Label>
				<Col>
					<Form.Control
						type="date"
						value={beforeDate}
						onChange={(e) => setBefore(e.target.value)}
					/>
				</Col>
			</Form.Group>
			<Form.Group as={Row} className="mb-2" controlId="after-date">
				<Form.Label column>After:</Form.Label>
				<Col>
					<Form.Control
						type="date"
						value={afterDate}
						onChange={(e) => setAfter(e.target.value)}
					/>
				</Col>
			</Form.Group>
		</>
	);
}
