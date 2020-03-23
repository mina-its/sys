import {WebMethod, LogType} from "../src/types";

export class Context {
	data?: any;
	event?: any;
	name?: string;
}

export class AjaxConfig {
	method?: WebMethod;
}

export class NotificationInfo {
	message: string;
	details?: string;
	type: LogType;
}

export class ComponentParams {
	template?: string;
	computed?: any;
	methods?: any;
	bind?: any;
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
