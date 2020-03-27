import {WebMethod, LogType, ObjectModifyType} from "../src/types";

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

export enum ItemState {
	Normal = 0,
	Updated = 1,
	Inserted = 2,
	Deleted = 4,
}

export class ItemMeta {
	marked: boolean;
	state: ItemState;
	dec: FunctionMeta | ObjectMeta;
	latest: any;
	ref: string;
}

export class FunctionMeta {

}

export class ObjectMeta {

}
