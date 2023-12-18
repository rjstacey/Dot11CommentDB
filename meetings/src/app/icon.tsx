export const renderIcon = (groupName: string, toolName: string) => {

	const groupNameFontSize = 1.9*192 / groupName.length;
	const toolNameFontSize = Math.min(1.5*192 / toolName.length, 100);

	return (
		<svg
			viewBox="0 0 192 192"
			width="192px"
			height="192px"
			xmlns="http://www.w3.org/2000/svg"
		>
			<defs>
				<linearGradient id="linearGradient1">
					<stop offset="0" stopColor="#0000ff" stopOpacity={1} />
					<stop offset="1" stopColor="#0000ff" stopOpacity={0.3} />
				</linearGradient>
				<linearGradient id="linearGradient2">
					<stop offset="0" stopColor="#ff5b7b" stopOpacity={1} />
					<stop offset="1" stopColor="#eb5b7e" stopOpacity={0.4} />
				</linearGradient>
				<radialGradient
					href="#linearGradient1"
					id="radialGradient1"
					cx="50%"
					cy="50%"
					r="60%"
					gradientUnits="userSpaceOnUse" />
				<radialGradient
					href="#linearGradient2"
					id="radialGradient2"
					cx="50%"
					cy="50%"
					r="60%"
					gradientUnits="userSpaceOnUse" />

			</defs>
			<text
				x="50%"
				y="50%"
				//textLength="90%"
				textAnchor="middle"
				style={{font: `bold ${toolNameFontSize}px sans-serif`, alignmentBaseline: "text-before-edge", fill: "url(#radialGradient2)", fillOpacity: 1}}
			>
				{toolName}
			</text>
			<text
				x="50%"
				y="50%"
				//textLength="100%"
				textAnchor="middle"
				style={{font: `bold ${groupNameFontSize}px sans-serif`, fill: "url(#radialGradient1)", fillOpacity: 1}}
			>
				{groupName}
			</text>
		</svg>
	)
}