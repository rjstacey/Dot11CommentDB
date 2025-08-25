import * as React from "react";
import { FormCheck } from "react-bootstrap";

const FormCheck2 = ({
	indeterminate = false,
	...props
}: { indeterminate?: boolean } & React.ComponentProps<typeof FormCheck>) => (
	<FormCheck
		ref={(el: HTMLInputElement) => el && (el.indeterminate = indeterminate)}
		{...props}
	/>
);

export default FormCheck2;
