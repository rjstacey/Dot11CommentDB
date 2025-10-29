import { saveAs } from "file-saver";
import { loginAndReturn } from "./user";

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export class ResponseError extends Error {
	public response: Response;

	constructor(res: Response, messsage: string) {
		super(messsage);
		this.name = res.statusText;
		this.response = res;

		Object.setPrototypeOf(this, ResponseError.prototype);
	}
}

function isMessageObject(obj: unknown): obj is { message: string } {
	return (
		typeof obj === "object" &&
		typeof (obj as { message: unknown }).message === "string"
	);
}

function urlParams(params: Record<string, any>) {
	let p = new URLSearchParams();
	for (const [key, value] of Object.entries(params)) {
		if (Array.isArray(value)) {
			value.forEach((v) => p.append(key, v));
		} else {
			p.append(key, value);
		}
	}
	return p.toString();
}

class AppFetch {
	private token: string | undefined;

	constructor(token?: string) {
		this.token = token;
	}

	setToken(token: string) {
		this.token = token;
	}

	async responseError(res: Response) {
		if (res.status === 401) {
			return loginAndReturn();
		} else {
			let s: unknown;
			try {
				if (
					res.headers
						.get("content-type")
						?.includes("application/json")
				) {
					s = await res.json();
				} else {
					s = await res.text();
				}
			} catch (error) {
				s = error;
			}
			let message = "";
			if (typeof s === "string") message = s;
			else if (isMessageObject(s)) message = s.message;
			else message = JSON.stringify(s);
			throw new ResponseError(res, message);
		}
	}

	async fetch(method: Method, url: string, params?: Record<string, any>) {
		const options: RequestInit = { method };

		options.headers = {
			Accept: "application/json, text/plain",
			Authorization: `Bearer ${this.token}`,
		};

		if (params) {
			if (method === "GET") {
				url += "?" + urlParams(params);
			} else {
				options.body = JSON.stringify(params);
				options.headers["Content-Type"] = "application/json";
			}
		}

		const res = await fetch(url, options);
		return res.ok ? res.json() : this.responseError(res);
	}

	get(url: string, params?: Record<string, any>) {
		return this.fetch("GET", url, params);
	}

	post(url: string, params?: Record<string, any>) {
		return this.fetch("POST", url, params);
	}

	patch(url: string, params?: Record<string, any>) {
		return this.fetch("PATCH", url, params);
	}

	put(url: string, params?: Record<string, any>) {
		return this.fetch("PUT", url, params);
	}

	delete(url: string, params?: Record<string, any>) {
		return this.fetch("DELETE", url, params);
	}

	/** GET that returns a file */
	async getFile(url: string, params?: Record<string, any>) {
		if (params) url += "?" + urlParams(params);

		const options: RequestInit = {
			method: "GET",
			headers: { Authorization: `Bearer ${this.token}` },
		};

		const res = await fetch(url, options);
		if (res.ok) {
			let filename = "download";
			const d = res.headers.get("content-disposition");
			if (d) {
				const m = d.match(/filename="(.*)"/i);
				if (m) filename = m[1];
			}
			saveAs(await res.blob(), filename);
			return filename;
		}

		this.responseError(res);
		return "";
	}

	/** PATCH that sends a file and returns a modified version of the file */
	async patchFile(url: string, file?: File, params?: Record<string, any>) {
		if (params) url += "?" + urlParams(params);

		const options: RequestInit = { method: "PATCH" };

		options.headers = {
			Authorization: `Bearer ${this.token}`,
			Accept: "application/octet-stream",
		};

		if (file) {
			options.body = file;
			options.headers["Content-Type"] = "application/octet-stream";
			options.headers[
				"Content-Disposition"
			] = `attachment; filename="${file.name}"`;
		}

		const res = await fetch(url, options);
		if (res.ok) {
			let filename = "download";
			const d = res.headers.get("content-disposition");
			if (d) {
				const m = d.match(/filename="(.*)"/i);
				if (m) filename = m[1];
			}
			saveAs(await res.blob(), filename);
			return filename;
		}

		return this.responseError(res);
	}

	/** POST that sends a file and returns JSON */
	async postFile(url: string, file: File, params?: Record<string, any>) {
		if (params) url += "?" + urlParams(params);

		const options: RequestInit = { method: "POST" };
		options.headers = {
			Authorization: `Bearer ${this.token}`,
			Accept: "application/json",
			"Content-Type": "application/octet-stream",
			"Content-Disposition": `attachment; filename="${file.name}"`,
		};
		options.body = file;

		const res = await fetch(url, options);
		return res.ok ? res.json() : this.responseError(res);
	}
}

const fetcher = new AppFetch();

export default fetcher;
