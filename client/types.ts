import {WebMethod} from "../src/types";

export class Context {
	data?: any;
	event?: any;
	name?: string;
}

export class AjaxConfig {
	method?: WebMethod;
	contentType?: string;
}

export enum NotifyType {
	Information = 1,
	Warning = 2,
	Error = 3,
}

export class NotificationInfo {
	message: string;
	details?: string;
	type: NotifyType;
}

export class ComponentParams {
	template?: string;
	computed?: any;
	methods?: any;
	watch?: any;
	beforeCreate?: () => void;
	created?: () => void;
	beforeMount?: () => void;
	mounted?: () => void;
	beforeUpdate?: () => void;
	updated?: () => void;
	beforeDestroy?: () => void;
	destroyed?: () => void;
	data?: () => void;
	render?: (ce) => any;
}
