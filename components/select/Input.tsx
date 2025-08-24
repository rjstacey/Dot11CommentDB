import type { SelectInputRendererProps } from ".";

function Input({ inputRef, props, state, methods }: SelectInputRendererProps) {
	return (
		<input
			ref={inputRef}
			tabIndex={-1}
			className="input"
			style={{ width: `${state.search.length + 1}ch` }}
			value={state.search}
			onChange={(event) => methods.setSearch(event.target.value)}
			disabled={props.disabled}
			autoComplete="off"
		/>
	);
}

export default Input;
