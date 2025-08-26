import React from "react";
import { Button, Modal } from "react-bootstrap";
import { LoremIpsum } from "lorem-ipsum";
import {
	Select,
	SelectItemRendererProps,
	SelectRendererProps,
} from "../select";
import { Icon } from "../icons";

const lorem = new LoremIpsum();

type Options = {
	value: any;
	label: string;
	disabled?: boolean;
};

const genOptions = (n: number) =>
	Array(n)
		.fill(0)
		.map((value, index) => ({
			value: index,
			label: lorem.generateWords(4),
			disabled: Math.random() > 0.8,
		}));

type ExtraArgs = {
	numberOfItems: number;
	usePortal: boolean;
	useCreate: boolean;
};

function WrappedSelect(
	args: Omit<React.ComponentProps<typeof Select>, "options" | "values"> &
		ExtraArgs & { portalRef: React.RefObject<any> }
) {
	const {
		usePortal,
		useCreate,
		portalRef,
		numberOfItems,
		onChange,
		...otherArgs
	} = args;
	const [select, setSelect] = React.useState<Options[]>([]);
	const [options, setOptions] = React.useState<Options[]>(() =>
		genOptions(numberOfItems)
	);

	function addOption({ props, state, methods }: SelectRendererProps) {
		const newItem = {
			value: options.length,
			label: state.search,
		};
		const newOptions = [...options, newItem];
		setOptions(newOptions);
		return newItem;
	}

	if (usePortal) otherArgs.portal = portalRef.current;

	if (useCreate) {
		otherArgs.createOption = addOption;
		otherArgs.create = true;
	}

	return (
		<div>
			<Select
				options={options}
				values={select}
				onChange={setSelect}
				dropdownWidth={300}
				{...otherArgs}
			/>
		</div>
	);
}

export function Basic(args: ExtraArgs) {
	const portalRef = React.useRef(null);
	const style = {
		display: "flex",
		width: "300px",
	};
	return (
		<div style={style}>
			<WrappedSelect portalRef={portalRef} {...args} />
		</div>
	);
}

const itemRenderer = ({ item, props }: SelectItemRendererProps) => {
	const style = {
		color: "#555",
		overflow: "hidden",
		//whiteSpace: 'nowrap',
		textOverflow: "ellipsis",
	};
	return (
		<div style={style}>
			<Icon name="user-check" />
			<span style={{ marginLeft: 10 }}>{item[props.labelField]}</span>
		</div>
	);
};

export function IconItems(args: ExtraArgs) {
	const portalRef = React.useRef(null);
	const style = {
		display: "flex",
		//width: "300px",
	};
	return (
		<WrappedSelect
			style={style}
			portalRef={portalRef}
			create
			itemRenderer={itemRenderer}
			selectItemRenderer={itemRenderer}
			{...args}
		/>
	);
}
IconItems.args = {
	useCreate: true,
};

export function ContainedSelect(args: ExtraArgs) {
	const portalRef = React.useRef(null);
	const style = {
		overflow: "hidden",
		width: "300px",
		height: "200px",
		border: "2px dashed black",
	};
	return (
		<div ref={portalRef} style={style}>
			<WrappedSelect portalRef={portalRef} {...args} />
		</div>
	);
}
ContainedSelect.args = {
	usePortal: true,
};

export function SelectInModal(args: ExtraArgs) {
	const portalRef = { current: document.querySelector("#root") };
	return (
		<Modal show={true}>
			<label>Select:</label>
			<WrappedSelect portalRef={portalRef} {...args} />
		</Modal>
	);
}

export function IconSelect(args: ExtraArgs) {
	const options = genOptions(10);
	return (
		<div style={{ display: "flex", justifyContent: "space-between" }}>
			<Select
				style={{ border: "none", padding: "none" }}
				options={options}
				values={[]}
				onChange={() => {}}
				placeholder=""
				searchable={false}
				handle={false}
				dropdownWidth={300}
				dropdownAlign="left"
				contentRenderer={() => <Button className="bi-import" />}
			/>
			<Select
				style={{ border: "none", padding: "none" }}
				options={options}
				values={[]}
				onChange={() => {}}
				placeholder=""
				searchable={false}
				handle={false}
				dropdownWidth={300}
				dropdownAlign="right"
				contentRenderer={() => <Button className="bi-import" />}
			/>
		</div>
	);
}

const story = {
	title: "Select",
	component: Select,
	args: {
		numberOfItems: 100,
		usePortal: false,
		useCreate: false,
	},
};

export default story;
