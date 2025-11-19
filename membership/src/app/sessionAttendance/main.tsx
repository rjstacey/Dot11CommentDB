/* An element that is positioned in the main content area */

export function Main({ children }: { children?: React.ReactNode }) {
	return (
		<div
			className="d-flex flex-column overflow-hidden w-100 h-100"
			style={{
				order: 10,
			}}
		>
			{children}
		</div>
	);
}
