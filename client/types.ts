import {WebMethod} from "../types";
import {stringify} from "../main";

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

