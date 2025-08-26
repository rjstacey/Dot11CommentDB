import React from "react";
import "./index.css";

export const parameters = {
    actions: { argTypesRegex: "^on[A-Z].*" },

    controls: {
		matchers: {
			color: /(background|color)$/i,
			date: /Date$/,
		},
	},

    a11y: {
        // 'todo' - show a11y violations in the test UI only
        // 'error' - fail CI on a11y violations
        // 'off' - skip a11y checks entirely
        test: "todo"
    }
};
export const tags = ["autodocs"];
