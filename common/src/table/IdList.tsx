import * as React from "react";
import { useDispatch, useSelector } from "react-redux";
import type { EntityId } from "@reduxjs/toolkit";

import { TextArea } from "../form";
import {
	AppTableDataSelectors,
	AppTableDataActions,
	FilterComp,
	CompOp,
} from "../store/appTableData";

import styles from "./IdList.module.css";

const idRegex = /[^\s,]+/g;

function IdList({
	style,
	className,
	ids,
	isValid,
	isNumber,
	onChange,
	focusOnMount,
}: {
	style?: React.CSSProperties;
	className?: string;
	ids: EntityId[];
	isValid: (id: EntityId) => boolean;
	isNumber: boolean;
	onChange: (ids: EntityId[]) => void;
	focusOnMount?: boolean;
}) {
	const textAreaRef = React.useRef<HTMLTextAreaElement>(null);
	const mirrorRef = React.useRef<HTMLDivElement>(null);
	const [value, setValue] = React.useState(() => ids.join(", "));

	React.useEffect(() => {
		const textAreaEl = textAreaRef.current!;
		const mirrorEl = mirrorRef.current!;

		const inputStyles = window.getComputedStyle(textAreaEl);
		[
			"margin",
			"padding",
			"border",
			"box-sizing",
			"font-family",
			"font-size",
			"font-kerning",
			"font-weight",
			"letter-spacing",
			"line-height",
			"padding",
			"text-decoration",
			"text-indent",
			"text-transform",
			"white-space",
			"word-spacing",
			"word-wrap",
		].forEach((property) => {
			mirrorEl.style.setProperty(
				property,
				inputStyles.getPropertyValue(property),
				inputStyles.getPropertyPriority(property)
			);
		});
		mirrorEl.style.borderColor = "transparent";

		textAreaEl.addEventListener("scroll", () => {
			mirrorEl.scrollTop = textAreaEl.scrollTop;
			mirrorEl.scrollLeft = textAreaEl.scrollLeft;
		});
	}, []);

	React.useLayoutEffect(() => {
		const textAreaEl = textAreaRef.current!;
		const mirrorEl = mirrorRef.current!;

		const c = textAreaEl.getBoundingClientRect();
		mirrorEl.style.width = `${c.width}px`;
		mirrorEl.style.height = `${c.height}px`;
	}, [value]);

	React.useEffect(() => {
		if (focusOnMount) {
			const textAreaEl = textAreaRef.current!;
			textAreaEl.focus();
			textAreaEl.selectionStart = textAreaEl.value.length;
		}
	}, [focusOnMount]);

	React.useEffect(() => {
		// Update value only if not receiving key input
		if (textAreaRef.current === document.activeElement) return;
		setValue(ids.join(", "));
	}, [ids]);

	function markInvalid(value: string) {
		return value.replace(idRegex, (match) => {
			const id = isNumber ? Number(match) : match;
			return isValid(id) ? match : `<mark>${match}</mark>`;
		});
	}

	function handleChange(value: string) {
		setValue(value);
		let updatedIds: EntityId[] = value.match(idRegex) || [];
		if (isNumber) updatedIds = updatedIds.map(Number);
		if (updatedIds.join() !== ids.join()) onChange(updatedIds);
	}

	return (
		<div
			className={styles.main + (className ? " " + className : "")}
			style={style}
		>
			<div
				ref={mirrorRef}
				className="mirror"
				dangerouslySetInnerHTML={{ __html: markInvalid(value) }}
			/>
			<TextArea
				id="id-list"
				ref={textAreaRef}
				className="input"
				value={value}
				onChange={(e) => handleChange(e.target.value)}
				placeholder="Enter list..."
				rows={1}
			/>
			<i
				style={{ visibility: value ? "visible" : "hidden" }}
				className="clear bi-x"
				onClick={() => handleChange("")}
			/>
		</div>
	);
}

export function IdFilter({
	selectors,
	actions,
	dataKey = "id",
	...props
}: {
	dataKey?: string;
	style?: React.CSSProperties;
	className?: string;
	focusOnMount?: boolean;
	selectors: AppTableDataSelectors;
	actions: AppTableDataActions;
}) {
	const dispatch = useDispatch();
	const { getField } = selectors;
	const ids = useSelector(selectors.selectIds);
	const entities = useSelector(selectors.selectEntities);
	const isNumber =
		ids.length > 0 &&
		typeof getField(entities[ids[0]], dataKey) === "number";

	const selectFilter = React.useCallback(
		(state: any) => selectors.selectFilter(state, dataKey),
		[selectors, dataKey]
	);
	const filter = useSelector(selectFilter);
	const values = filter.comps.map((v) => v.value);

	const isValid = React.useCallback(
		(value: EntityId) =>
			ids.findIndex((id) => getField(entities[id], dataKey) === value) !==
			-1,
		[ids, entities, dataKey, getField]
	);

	const onChange = React.useCallback(
		(values: EntityId[]) => {
			const comps: FilterComp[] = values.map((value: EntityId) => ({
				value,
				operation: CompOp.EQ,
			}));
			dispatch(actions.setFilter({ dataKey, comps }));
		},
		[dispatch, actions, dataKey]
	);

	return (
		<IdList
			ids={values}
			onChange={onChange}
			isValid={isValid}
			isNumber={isNumber}
			{...props}
		/>
	);
}

export function IdSelector({
	dataKey = "id",
	selectors,
	actions,
	...props
}: {
	dataKey?: string;
	selectors: AppTableDataSelectors;
	actions: AppTableDataActions;
	style?: React.CSSProperties;
	className?: string;
	focusOnMount?: boolean;
}) {
	const dispatch = useDispatch();
	const { getField } = selectors;
	const ids = useSelector(selectors.selectIds);
	const entities = useSelector(selectors.selectEntities);
	const selected = useSelector(selectors.selectSelected);
	const values = selected.map((id) => getField(entities[id]!, dataKey));
	const isNumber =
		ids.length > 0 &&
		typeof getField(entities[ids[0]], dataKey) === "number";

	const isValid = React.useCallback(
		(value: EntityId) =>
			ids.findIndex((id) => getField(entities[id], dataKey) === value) !==
			-1,
		[ids, entities, dataKey, getField]
	);

	const onChange = React.useCallback(
		(values: EntityId[]) => {
			const selected = values.reduce(
				(selected: EntityId[], value: EntityId) => {
					const i = ids.findIndex(
						(id) => getField(entities[id]!, dataKey) === value
					);
					if (i !== -1) selected.push(ids[i]);
					return selected;
				},
				[]
			);
			dispatch(actions.setSelected(selected));
		},
		[dispatch, actions, dataKey, ids, entities, getField]
	);

	return (
		<IdList
			ids={values}
			onChange={onChange}
			isValid={isValid}
			isNumber={isNumber}
			{...props}
		/>
	);
}
