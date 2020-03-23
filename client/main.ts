import {AjaxConfig, ComponentParams, NotificationInfo} from "./types";
import {GetOptions, IError, StatusCode, WebMethod, LogType, WebResponse, EmbeddedInfo, Pair} from "../src/types";

declare let $, Vue, axios, text, _: any;

export function component(name: string, props: string[], params: ComponentParams) {
	(params as any).props = props;
	Vue.component(name, params);
}

export function get(pack: string, objectName: string, options: GetOptions, done: (err, result?) => void) {
}

export function log(...message) {
	console.log(message);
}

export function isRtl() {
	return false;
}

export function invoke(pack: string, name: string, args: any[]) {
	return false;
}

export function getText(pack, key) {
	if (text[pack + "." + key]) return text[pack + "." + key];

	console.warn(`Warning: text '${pack}.${key}' not found`);
	return key.replace(/-/g, " ");
}

export function toFriendlyFileSizeString(size: number): string {
	if (size < 1024)
		return size + " B";

	else if (size < 1024 * 1024)
		return (size / 1024).toFixed(1) + " KB";

	else
		return (size / 1024 / 1024).toFixed(1) + " MB";
}

export function joinUri(...parts: string[]): string {
	let uri = "";
	for (let part of parts) {
		uri += "/" + (part || "").replace(/^\//, '').replace(/\/$/, '');
	}
	return uri.substr(1);
}

export function ajax(url: string, data: any, config: AjaxConfig, done: (res: WebResponse) => void, fail?: (err: { code: StatusCode, message: string }) => void) {
	let params: any = {url, data};

	if (config && config.method)
		params.method = config.method;
	else
		params.method = data ? WebMethod.post : WebMethod.get;

	if (data && data._files) {
		params.data = new FormData();
		for (let file of data._files) {
			params.data.append('files[]', file, file['name']);
		}
		params.data.append('data', JSON.stringify(data));
		params.headers = {'Content-Type': 'multipart/form-data'};
	}

	fail = fail || notify;
	axios(params).then((res) => {
		if (res.code && res.code != StatusCode.Ok)
			fail({code: res.code, message: res.message});
		else {
			try {
				done(res.data);
			} catch (ex) {
				notify(`error on handling ajax response: ${ex.message}`);
				console.error(res, ex);
			}
		}
	}).catch((err) => {
		console.error(`error on ajax '${url}'`, err);

		if (err.response && err.response.data && err.response.data.message)
			fail({message: err.response.data.message, code: err.response.data.code});
		else if (err.response && err.response.data)
			fail({message: err.response.data, code: err.response.status});
		else
			fail({message: err.toString(), code: StatusCode.UnknownError});
	});
}

export function notify(content: string | IError, type?: LogType, params?: NotificationInfo) {
	if (!content) return;
	let message = typeof content == "string" ? content : content.message;
	if (!type) {
		if (typeof content != "string")
			type = content.code && content.code != StatusCode.Ok ? LogType.Error : LogType.Info;
		else
			type = LogType.Info;
	}
	window.dispatchEvent(new CustomEvent('notify', {detail: {message, type}}));
}

export function question(questionId: string, message: string, options: Pair[], select: (item: Pair) => void) {
	window.dispatchEvent(new CustomEvent('question', {detail: {questionId, message, options, select}}));
	$("#question-box").modal("show");
}

export function getBsonId(item: any): string {
	if (!item)
		throw "Item is null";
	else if (!item._id) {
		console.error("Invalid item data, _id is expected:", item);
		notify('Invalid data, please check the logs!');
		return null;
	} else
		return item._id.$oid;
}

export function head_script(src) {
	if (document.querySelector("script[src='" + src + "']")) {
		return;
	}
	let script = document.createElement('script');
	script.setAttribute('src', src);
	script.setAttribute('type', 'text/javascript');
	document.head.appendChild(script)
}

export function body_script(src) {
	if (document.querySelector("script[src='" + src + "']")) {
		return;
	}
	let script = document.createElement('script');
	script.setAttribute('src', src);
	script.setAttribute('type', 'text/javascript');
	document.body.appendChild(script)
}

export function del_script(src) {
	let el = document.querySelector("script[src='" + src + "']");
	if (el) {
		el.remove();
	}
}

export function head_link(href) {
	if (document.querySelector("link[href='" + href + "']")) {
		return;
	}
	let link = document.createElement('link');
	link.setAttribute('href', href);
	link.setAttribute('rel', "stylesheet");
	link.setAttribute('type', "text/css");
	document.head.appendChild(link)
}

export function body_link(href) {
	if (document.querySelector("link[href='" + href + "']")) {
		return;
	}
	let link = document.createElement('link');
	link.setAttribute('href', href);
	link.setAttribute('rel', "stylesheet");
	link.setAttribute('type', "text/css");
	document.body.appendChild(link)
}

export function del_link(href) {
	let el = document.querySelector("link[href='" + href + "']");
	if (el) {
		el.remove();
	}
}

export function setPropertyEmbeddedError(doc: any, propName: string, error: string) {
	if (!doc) throw `setPropertyEmbeddedError doc is empty, prop:${propName}!`;
	doc._ = doc._ || {};
	doc._[propName] = doc._[propName] || {};
	(doc._[propName] as EmbeddedInfo).err = error;
}
