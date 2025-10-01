import * as React from "react";
import { FormSelect } from "react-bootstrap";
import ReactDOM from "react-dom";

import Dropdown from "./Dropdown";
import MultiSelectItem from "./MultiSelectItem";
import SelectItem from "./SelectItem";
import Input from "./Input";

import debounce from "lodash.debounce";

import styles from "./select.module.css";

const Content = (props: React.ComponentProps<"button">) => (
	<button className="content" type="button" {...props} />
);
const Loading = (props: React.ComponentProps<"div">) => (
	<div className="loading" {...props} />
);
const Clear = (props: React.ComponentProps<"div">) => (
	<div className="clear" {...props} />
);
const Separator = (props: React.ComponentProps<"div">) => (
	<div className="separator" {...props} />
);
const Placeholder = (props: React.ComponentProps<"div">) => (
	<div className={styles.placeholder} {...props} />
);
const NoData = ({ label }: { label: string }) => (
	<div className="no-data">{label}</div>
);

function defaultContentRenderer({
	props,
	state,
	methods,
}: SelectRendererProps<ItemType>): React.ReactNode {
	const values = props.values;
	if (props.multi) {
		return values.map((item) =>
			props.multiSelectItemRenderer({
				item,
				props,
				state,
				methods,
			})
		);
	} else if (values.length > 0) {
		return props.selectItemRenderer({
			item: values[0],
			props,
			state,
			methods,
		});
	}
	return null;
}

const defaultAddItemRenderer = ({
	item,
	props,
}: {
	item: ItemType;
} & SelectRendererProps<ItemType>): React.ReactNode => (
	<span>{`Add "${item[props.labelField]}"`}</span>
);

const defaultItemRenderer = ({
	item,
	props,
}: {
	item: ItemType;
} & SelectRendererProps<ItemType>): React.ReactNode => (
	<span>{item[props.labelField]}</span>
);

async function defaultCreateOption({
	props,
	state,
	methods,
}: SelectRendererProps<ItemType>) {
	return {
		[props.valueField]: state.search,
		[props.labelField]: state.search,
	};
}

export type ItemType = Record<string, any>; //{ [key: string]: any} | {};

export type SelectRendererProps<T> = {
	props: SelectRequiredProps<T> & SelectDefaultProps<T>;
	state: SelectState<T>;
	methods: SelectMethods<T>;
};
export type SelectItemRendererProps<T> = {
	item: T;
} & SelectRendererProps<T>;

export type SelectInputRendererProps<T> = {
	inputRef: React.RefObject<HTMLInputElement>;
} & SelectRendererProps<T>;

export type SelectInternalProps<T> = SelectRequiredProps<T> &
	SelectDefaultProps<T>;

type SelectRequiredProps<T> = {
	values: T[];
	options: T[];

	id?: string;
	style?: React.CSSProperties;
	className?: string;
	dropdownClassName?: string;
	"aria-label"?: string;

	portal?: Element | null;

	dropdownWidth?: number;

	onClick?: React.MouseEventHandler;
	onFocus?: React.FocusEventHandler;
	onBlur?: React.FocusEventHandler;

	onChange: (values: T[]) => void;

	isInvalid?: boolean;
};

type SelectDefaultProps<T> = {
	onChange: (values: T[]) => void;
	onRequestOpen: () => void;
	onRequestClose: () => void;

	placeholder: string;
	addPlaceholder: string;
	handle: boolean;
	loading: boolean;
	multi: boolean;
	create: boolean;
	clearable: boolean;
	searchable: boolean;
	backspaceDelete: boolean;
	readOnly: boolean;
	disabled: boolean;
	closeOnScroll: boolean;
	closeOnBlur: boolean;
	clearOnSelect: boolean;
	clearOnBlur: boolean;
	keepOpen: boolean;
	keepSelectedInList: boolean;
	autoFocus: boolean;

	labelField: keyof T;
	valueField: keyof T;
	searchBy: null;
	sortBy: null;
	valuesEqual: (a: any, b: any) => boolean;

	separator: boolean;
	noDataLabel: string;
	dropdownGap: number;
	dropdownHeight: number;
	dropdownPosition: "bottom" | "top" | "auto";
	dropdownAlign: "left" | "right";
	estimatedItemHeight: number;

	createOption: (props: SelectRendererProps<T>) => Promise<T | undefined>;

	/* Select children */
	contentRenderer: (props: SelectRendererProps<T>) => React.ReactNode;

	/* Content children */
	selectItemRenderer: (props: SelectItemRendererProps<T>) => React.ReactNode;
	multiSelectItemRenderer: (
		props: SelectItemRendererProps<T>
	) => React.ReactNode;
	inputRenderer: (props: SelectInputRendererProps<T>) => React.ReactNode;

	/* Dropdown */
	dropdownRenderer: (props: SelectRendererProps<T>) => React.ReactNode;

	/* Dropdown children */
	extraRenderer: (props: SelectRendererProps<T>) => React.ReactNode;
	addItemRenderer: (props: SelectItemRendererProps<T>) => React.ReactNode;
	itemRenderer: (props: SelectItemRendererProps<T>) => React.ReactNode;
	noDataRenderer: (props: SelectRendererProps<T>) => React.ReactNode;
};

export type SelectState<T> = {
	isOpen: boolean;
	search: string;
	selectBounds: DOMRect | null;
	cursor: number | null;
	searchResults: T[];
};

export type SelectMethods<T> = {
	open: () => void;
	close: () => void;
	addItem: (item: T) => void;
	addSearchItem: () => Promise<void>;
	removeItem: (item: T) => void;
	setSearch: (search: string) => void;
	getInputSize: () => number;
	isSelected: (item: T) => boolean;
	isDisabled: (item: T) => boolean;
	sort: (options: T[]) => T[];
	filter: (options: T[]) => T[];
	searchResults: () => T[];
};

class SelectInternal<T extends ItemType> extends React.Component<
	SelectInternalProps<T>,
	SelectState<T>
> {
	constructor(props: SelectInternalProps<T>) {
		super(props);

		this.state = {
			isOpen: props.keepOpen,
			search: "",
			selectBounds: null,
			cursor: null,
			searchResults: props.options,
		};

		this.methods = {
			open: this.open,
			close: this.close,
			addItem: this.addItem,
			addSearchItem: this.addSearchItem,
			removeItem: this.removeItem,
			setSearch: this.setSearch,
			getInputSize: this.getInputSize,
			isSelected: this.isSelected,
			isDisabled: this.isDisabled,
			sort: this.sort,
			filter: this.filter,
			searchResults: this.searchResults,
		};

		this.selectRef = React.createRef();
		this.inputRef = React.createRef();
		this.dropdownRef = React.createRef();

		this.debouncedUpdateSelectBounds = debounce(this.updateSelectBounds);
		this.debouncedOnScroll = debounce(this.onScroll);
	}

	state: SelectState<T>;
	private methods: SelectMethods<T>;
	private selectRef: React.RefObject<HTMLDivElement>;
	private inputRef: React.RefObject<HTMLInputElement>;
	private dropdownRef: React.RefObject<HTMLDivElement>;

	private debouncedUpdateSelectBounds: () => void;
	private debouncedOnScroll: () => void;

	componentDidMount() {
		this.updateSelectBounds();
	}

	componentDidUpdate(
		prevProps: SelectInternalProps<T>,
		prevState: SelectState<T>
	) {
		const { props, state } = this;

		if (
			//prevProps.options !== props.options ||
			prevProps.keepSelectedInList !== props.keepSelectedInList ||
			prevProps.sortBy !== props.sortBy ||
			prevProps.disabled !== props.disabled
		) {
			this.setState({
				isOpen: props.keepOpen,
				cursor: null,
				searchResults: this.searchResults(),
			});
		}

		if (
			prevProps.multi !== props.multi ||
			prevProps.values !== props.values ||
			prevState.search !== state.search
		) {
			this.updateSelectBounds();
		}
	}

	onOutsideClick = (event: MouseEvent) => {
		const { state } = this;

		// Ignore if not open
		if (!state.isOpen) return;

		const { target } = event;
		if (!(target instanceof Element)) return;

		// Ignore click in dropdown
		const dropdownEl = this.dropdownRef.current;
		if (
			dropdownEl &&
			(dropdownEl === target || dropdownEl.contains(target))
		)
			return;

		// Ignore click in select
		const selectEl = this.selectRef.current;
		if (selectEl && (selectEl === target || selectEl.contains(target)))
			return;

		this.close();
	};

	onScroll = () => {
		if (this.props.closeOnScroll) {
			this.close();
			return;
		}

		this.updateSelectBounds();
	};

	updateSelectBounds = () => {
		if (!this.selectRef.current) return;
		const selectBounds = this.selectRef.current.getBoundingClientRect();
		this.setState({ selectBounds });
	};

	open = () => {
		const { props, state } = this;
		if (state.isOpen) return;

		window.addEventListener("resize", this.debouncedUpdateSelectBounds);
		document.addEventListener("scroll", this.debouncedOnScroll, true);
		document.addEventListener("click", this.onOutsideClick, true);

		this.updateSelectBounds();

		let cursor: number | null = null;
		if (!props.multi && props.values.length > 0) {
			// Position cursor on selected value
			const item = props.values[0];
			cursor = state.searchResults.findIndex((o) =>
				props.valuesEqual(item, o)
			);
			if (cursor < 0) cursor = null;
		}
		this.setState({ isOpen: true, cursor });

		if (props.onRequestOpen) props.onRequestOpen();
	};

	close = () => {
		const { props, state } = this;
		if (!state.isOpen) return;

		window.removeEventListener("resize", this.debouncedUpdateSelectBounds);
		document.removeEventListener("scroll", this.debouncedOnScroll, true);
		document.removeEventListener("click", this.onOutsideClick, true);

		this.setState({
			isOpen: false,
			search: props.clearOnBlur ? "" : state.search,
			searchResults: props.options,
			cursor: null,
		});

		if (props.onRequestClose) props.onRequestClose();
	};

	addItem = (item: T) => {
		const { props } = this;
		let values: T[];
		if (props.multi) {
			values = [...props.values, item];
		} else {
			values = [item];
			this.close();
		}

		props.onChange(values);

		if (props.clearOnSelect) {
			this.setState({ search: "" }, () =>
				this.setState({ searchResults: this.searchResults() })
			);
		}
	};

	addSearchItem = async () => {
		const { props, state, methods } = this;
		const item = await props.createOption({ props, state, methods });
		if (item) this.addItem(item);
	};

	removeItem = (item: T) => {
		const { props } = this;
		const newValues = props.values.filter(
			(valueItem) => !props.valuesEqual(valueItem, item)
		);
		props.onChange(newValues);
	};

	clearAll: React.MouseEventHandler = (e) => {
		e.stopPropagation();
		this.props.onChange([]);
	};

	setSearch = (search: string) => {
		if (search && !this.state.isOpen) this.open();
		this.setState({ search }, () =>
			this.setState({
				cursor: 0,
				searchResults: this.searchResults(),
			})
		);
	};

	getInputSize = () => {
		const { props, state } = this;
		if (state.search) return state.search.length;
		if (props.values.length > 0) return props.addPlaceholder.length;
		return props.placeholder.length;
	};

	isSelected = (item: ItemType) => {
		const { props } = this;
		return !!props.values.find((selectedItem) =>
			props.valuesEqual(selectedItem, item)
		);
	};

	isDisabled = (item: T) => Boolean("disabled" in item && item.disabled);

	sort = (options: T[]) => {
		const { sortBy } = this.props;
		if (!sortBy) return options;

		return options.sort((a, b) => {
			const a_v = a[sortBy];
			const b_v = b[sortBy];
			if (a_v < b_v) return -1;
			else if (a_v > b_v) return 1;
			else return 0;
		});
	};

	filter = (options: T[]) => {
		const { search } = this.state;
		const searchBy: keyof T = this.props.searchBy || this.props.labelField;
		const safeString = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		const regexp = new RegExp(safeString, "i");
		return options.filter((item) =>
			Array.isArray(searchBy)
				? searchBy.reduce(
						(result, searchBy) =>
							result || regexp.test(item[searchBy]),
						false
				  )
				: regexp.test(item[searchBy])
		);
	};

	searchResults = () => {
		const { props, state, methods } = this;

		let { options } = props;
		if (!props.keepSelectedInList)
			options = options.filter((item) => methods.isSelected(item));
		options = methods.filter(options);
		options = methods.sort(options);
		if (props.create && state.search) {
			const newItem = {
				[props.valueField]: state.search,
				[props.labelField]: state.search,
			};
			options = [newItem as T, ...options];
		}
		return options;
	};

	onClick: React.MouseEventHandler = (event) => {
		if (event.detail === 0) return; // Ignore click from keyboard
		const { props, state } = this;
		if (!props.disabled && !props.readOnly && !props.keepOpen) {
			event.preventDefault();
			if (state.isOpen) {
				this.close();
			} else {
				this.open();
			}
		}
		props.onClick?.(event);
	};

	onFocus: React.FocusEventHandler = (event) => {
		if (
			this.inputRef.current &&
			document.activeElement !== this.inputRef.current
		) {
			this.inputRef.current.focus();
		}
		this.props.onFocus?.(event);
	};

	onBlur: React.FocusEventHandler = (event) => {
		if (this.props.closeOnBlur) {
			this.close();
		}
		this.props.onBlur?.(event);
	};

	onKeyDown: React.KeyboardEventHandler = (event) => {
		const { props, state } = this;

		const escape = event.key === "Escape";
		const enter = event.key === "Enter";
		const arrowUp = event.key === "ArrowUp";
		const arrowDown = event.key === "ArrowDown";
		const backspace = event.key === "Backspace";

		if (
			backspace &&
			props.backspaceDelete &&
			!state.search &&
			props.values.length > 0
		) {
			const item = props.values[props.values.length - 1];
			this.removeItem(item);
		}

		if (!state.isOpen) {
			if (arrowDown || enter) {
				this.open();
				this.setState({ cursor: 0 });
			}
			return; // Not open so nothing more to do
		}

		// Only get here if open
		if (escape && !props.keepOpen) {
			this.close();
		}

		if (enter) {
			const item = state.searchResults[state.cursor || 0];
			if (item && !this.isDisabled(item)) {
				if (!this.isSelected(item)) this.addItem(item);
				else this.removeItem(item);
			}
			event.preventDefault();
		}

		if (arrowDown || arrowUp) {
			let { cursor } = state;
			let wrap = 0;
			let item: T;
			do {
				if (cursor === null) {
					cursor = 0;
				} else {
					if (arrowDown) {
						if (cursor === state.searchResults.length - 1) {
							cursor = 0;
							wrap++;
						} else cursor += 1;
					} else {
						// arrowUp
						if (cursor === 0) {
							cursor = state.searchResults.length - 1;
							wrap++;
						} else cursor -= 1;
					}
				}
				item = state.searchResults[cursor];
			} while (item && this.isDisabled(item) && wrap < 2);
			this.setState({ cursor });
		}
	};

	renderDropdown = () => {
		const { props, state, methods } = this;
		const selectBounds = state.selectBounds!;
		const style: Partial<React.CSSProperties> = {
			width: props.dropdownWidth || selectBounds.width,
		};

		let className = styles["dropdown"];
		if (props.dropdownClassName) className += ` ${props.dropdownClassName}`;

		const dropdownEl = (
			<div
				ref={this.dropdownRef}
				className={className}
				style={style}
				onMouseDown={(e) => {
					e.stopPropagation();
				}} // prevent click propagating to select and closing the dropdown
			>
				{props.dropdownRenderer({ props, state, methods })}
			</div>
		);

		// Determine if above or below selector
		let position = props.dropdownPosition;
		let align = props.dropdownAlign;
		let height = props.dropdownHeight;
		let gap = props.dropdownGap;
		if (position === "auto") {
			const dropdownHeight = selectBounds.bottom + height + gap;
			if (
				dropdownHeight > window.innerHeight &&
				dropdownHeight > selectBounds.top
			)
				position = "top";
			else position = "bottom";
		}

		if (props.portal) {
			style.position = "fixed";
			if (align === "left") style.left = selectBounds.left - 1;
			else style.right = selectBounds.right - 1;
			if (position === "bottom") style.top = selectBounds.bottom + gap;
			else style.bottom = window.innerHeight - selectBounds.top + gap;

			return ReactDOM.createPortal(dropdownEl, props.portal);
		} else {
			style.position = "absolute";
			if (align === "left") style.left = -1;
			else style.right = -1;
			if (position === "bottom")
				style.top = selectBounds.height + 2 + gap;
			else style.bottom = selectBounds.height + 2 + gap;

			return dropdownEl;
		}
	};

	render() {
		const { props, state, methods } = this;

		let cn = styles["select"];
		if (props.handle) cn += " handle";
		if (props.disabled) cn += " disabled";
		if (props.readOnly) cn += " read-only";
		if (props.isInvalid) cn += " is-invalid";
		if (props.className) cn += ` ${props.className}`;

		let content = props.contentRenderer({ props, state, methods });
		if (!content && props.placeholder && !state.search)
			content = <Placeholder>{props.placeholder}</Placeholder>;

		return (
			<div
				ref={this.selectRef}
				style={props.style}
				className={cn}
				tabIndex={props.disabled || props.readOnly ? -1 : 0}
				aria-label={props["aria-label"]}
				aria-expanded={state.isOpen}
				aria-disabled={props.disabled}
				role="listbox"
				onClick={this.onClick}
				onKeyDown={this.onKeyDown}
				onFocus={this.onFocus}
				onBlur={this.onBlur}
			>
				<Content
					id={props.id}
					style={{ minWidth: `${props.placeholder.length}ch` }}
				>
					{content}
					{!props.readOnly &&
						props.searchable &&
						props.inputRenderer({
							inputRef: this.inputRef,
							props,
							state,
							methods,
						})}
				</Content>

				{props.loading && <Loading />}

				{!props.readOnly && (
					<>
						{props.clearable && <Clear onClick={this.clearAll} />}
						{props.separator && <Separator />}
						{state.isOpen && this.renderDropdown()}
					</>
				)}
			</div>
		);
	}

	static defaultProps = {
		onChange: () => undefined,
		onRequestOpen: () => undefined,
		onRequestClose: () => undefined,
		createOption: defaultCreateOption,
		placeholder: "Select...",
		addPlaceholder: "",
		handle: true,
		loading: false,
		multi: false,
		create: false,
		clearable: false,
		searchable: true,
		backspaceDelete: true,
		readOnly: false,
		disabled: false,
		closeOnScroll: false,
		closeOnBlur: false,
		clearOnSelect: true,
		clearOnBlur: true,
		keepOpen: false,
		keepSelectedInList: true,
		autoFocus: false,

		labelField: "label",
		valueField: "value",
		searchBy: null,
		sortBy: null,
		valuesEqual: (a: any, b: any) => a === b,

		separator: false,
		noDataLabel: "No data",
		dropdownGap: 5,
		dropdownHeight: 300,
		dropdownPosition: "bottom",
		dropdownAlign: "left",
		estimatedItemHeight: 29.6667,

		/* Select children */
		contentRenderer: defaultContentRenderer,

		/* Content children */
		selectItemRenderer: (props) => <SelectItem {...props} />,
		multiSelectItemRenderer: (props) => <MultiSelectItem {...props} />,
		inputRenderer: (props) => <Input {...props} />,

		/* Dropdown */
		dropdownRenderer: (props) => <Dropdown {...props} />,

		/* Dropdown children */
		extraRenderer: () => null,
		addItemRenderer: defaultAddItemRenderer,
		itemRenderer: defaultItemRenderer,
		noDataRenderer: ({ props }) => <NoData label={props.noDataLabel} />,
	} satisfies SelectDefaultProps<ItemType>;
}

export type SelectProps<T extends ItemType> = JSX.LibraryManagedAttributes<
	typeof SelectInternal<T>,
	SelectInternalProps<T>
>;

export const Select = <T extends ItemType>(props: SelectProps<T>) => (
	<SelectInternal<T> {...props} />
);

//export default Select;
