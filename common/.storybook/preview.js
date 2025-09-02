import "./index.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";

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
		test: "todo",
	},
};
export const tags = ["autodocs"];
