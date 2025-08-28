import * as React from "react";
import ReactDOM from "react-dom";

import Dropdown from "./Dropdown";
import MultiSelectItem from "./MultiSelectItem";
import SelectItem from "./SelectItem";
import Input from "./Input";

import debounce from "lodash.debounce";

import styles from "./select.module.css";

const Content = (props: React.ComponentProps<"div">) => (
	<div className="content" {...props} />
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
/*const DropdownHandle = (props: React.ComponentProps<typeof Icon>) => (
	<Icon className="dropdown-select-handle" type="handle" {...props} />
);*/
const Placeholder = (props: React.ComponentProps<"div">) => (
	<div className={styles.placeholder} {...props} />
);
const NoData = ({ props }: SelectRendererProps) => (
	<div className="no-data">{props.noDataLabel}</div>
);

function defaultContentRenderer({
	props,
	state,
	methods,
}: SelectRendererProps): React.ReactNode {
	const values = props.values;
	if (props.multi) {
		return values.map((item) => {
			const key = "" + item[props.valueField] + item[props.labelField];
			const el = props.multiSelectItemRenderer({
				item,
				props,
				state,
				methods,
			});
			return { ...el, key };
		});
	} else if (values.length > 0) {
		const item = values[0];
		return props.selectItemRenderer({ item, props, state, methods });
	}
	return null;
}

const defaultAddItemRenderer = ({
	item,
	className,
	props,
	state,
	methods,
}: {
	item: ItemType;
	className?: string;
} & SelectRendererProps): React.ReactNode => (
	<span className={className}>{`Add "${item[props.labelField]}"`}</span>
);

const defaultItemRenderer = ({
	item,
	className,
	props,
	state,
	methods,
}: {
	item: ItemType;
	className?: string;
} & SelectRendererProps): React.ReactNode => (
	<span className={className}>{item[props.labelField]}</span>
);

function defaultCreateOption({
	props,
	state,
	methods,
}: SelectRendererProps): ItemType {
	return {
		[props.valueField]: state.search,
		[props.labelField]: state.search,
	};
}

export type ItemType = any; //{ [key: string]: any} | {};

export type SelectRendererProps = {
	props: any;
	state: SelectState;
	methods: SelectMethods;
};
export type SelectItemRendererProps = { item: ItemType } & SelectRendererProps;

export type SelectInputRendererProps = {
	inputRef: React.RefObject<HTMLInputElement | null>;
} & SelectRendererProps;

export type SelectInternalProps = SelectDefaultProps & {
	values: ItemType[];
	options: ItemType[];

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
};

type SelectDefaultProps = {
	onChange: (values: ItemType[]) => void;

	onRequestOpen: () => void;
	onRequestClose: () => void;
	createOption: typeof defaultCreateOption;
	placeholder: string;
	addPlaceholder: string;
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

	labelField: string;
	valueField: string;
	searchBy: null;
	sortBy: null;
	valuesEqual: (a: ItemType, b: ItemType) => boolean;

	handle: boolean;
	separator: boolean;
	noDataLabel: string;
	dropdownGap: number;
	dropdownHeight: number;
	dropdownPosition: "bottom" | "top" | "auto";
	dropdownAlign: "left" | "right";
	estimatedItemHeight: number;

	/* Select children */
	contentRenderer: typeof defaultContentRenderer;

	/* Content children */
	selectItemRenderer: (props: SelectItemRendererProps) => React.ReactNode;
	multiSelectItemRenderer: (
		props: SelectItemRendererProps
	) => React.ReactNode;
	inputRenderer: (props: SelectInputRendererProps) => React.ReactNode;

	/* Dropdown */
	dropdownRenderer: (props: SelectRendererProps) => React.ReactNode;

	/* Dropdown children */
	addItemRenderer: typeof defaultAddItemRenderer;
	itemRenderer: typeof defaultItemRenderer;
	noDataRenderer: (props: SelectRendererProps) => React.ReactNode;
};

export type SelectState = {
	isOpen: boolean;
	search: string;
	selectBounds: DOMRect | null;
	cursor: number | null;
	searchResults: ItemType[];
};

export type SelectMethods = {
	open: () => void;
	close: () => void;
	addItem: (item: ItemType) => void;
	addSearchItem: () => Promise<void>;
	removeItem: (item: ItemType) => void;
	setSearch: (search: string) => void;
	getInputSize: () => number;
	isSelected: (item: ItemType) => boolean;
	isDisabled: (item: ItemType) => boolean;
	sort: (options: ItemType[]) => ItemType[];
	filter: (options: ItemType[]) => ItemType[];
	searchResults: () => ItemType[];
};

class SelectInternal extends React.Component<SelectInternalProps, SelectState> {
	constructor(props: SelectInternalProps) {
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

	state: SelectState;
	private methods: SelectMethods;
	private selectRef: React.RefObject<HTMLDivElement | null>;
	private inputRef: React.RefObject<HTMLInputElement | null>;
	private dropdownRef: React.RefObject<HTMLDivElement | null>;

	private debouncedUpdateSelectBounds: () => void;
	private debouncedOnScroll: () => void;

	componentDidMount() {
		this.updateSelectBounds();
	}

	componentDidUpdate(prevProps: SelectInternalProps, prevState: SelectState) {
		const { props, state } = this;

		if (
			prevProps.options !== props.options ||
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

	addItem = (item: ItemType) => {
		const { props } = this;
		let values: ItemType[];
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
		this.addItem(item);
	};

	removeItem = (item: ItemType) => {
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

	isDisabled = (item: ItemType) => item.disabled || false;

	sort = (options: ItemType[]) => {
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

	filter = (options: ItemType[]) => {
		const { search } = this.state;
		const searchBy = this.props.searchBy || this.props.labelField;
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
			options = [newItem, ...options];
		}
		return options;
	};

	onClick: React.MouseEventHandler = (event) => {
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
			if (item && !item.disabled) {
				if (!this.isSelected(item)) this.addItem(item);
				else this.removeItem(item);
			}
			event.preventDefault();
		}

		if (arrowDown || arrowUp) {
			let { cursor } = state;
			let wrap = 0;
			let item: ItemType;
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
			} while (item && item.disabled && wrap < 2);
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

		let cn = "form-select " + styles["select"];
		if (props.disabled) cn += " disabled";
		if (props.readOnly) cn += " read-only";
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
				<select id={props.id} style={{ display: "none" }} />
				<Content style={{ minWidth: `${props.placeholder.length}ch` }}>
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
						{/*props.handle && (
							<i
								className={
									"bi-chevron" +
									(state.isOpen ? "-up" : "-down")
								}
							/>
						)*/}

						{state.isOpen && this.renderDropdown()}
					</>
				)}
			</div>
		);
	}

	static defaultProps: SelectDefaultProps = {
		onChange: () => undefined,
		onRequestOpen: () => undefined,
		onRequestClose: () => undefined,
		createOption: defaultCreateOption,
		placeholder: "Select...",
		addPlaceholder: "",
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
		valuesEqual: (a: ItemType, b: ItemType) => a === b,

		handle: true,
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
		addItemRenderer: defaultAddItemRenderer,
		itemRenderer: defaultItemRenderer,
		noDataRenderer: (props) => <NoData {...props} />,
	};
}

export type SelectProps = JSX.LibraryManagedAttributes<
	typeof SelectInternal,
	SelectInternalProps
>;

export const Select = (props: SelectProps) => <SelectInternal {...props} />;

//export default Select;
