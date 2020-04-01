export class AuditArgs {
}
export class Role {
}
export class User {
    constructor() {
        this.roles = [];
        this.disabled = false;
    }
}
export class AuditType {
}
export class Global {
    constructor() {
        this.dbs = {}; // any not mongodb.Db because of client side reference
        this.packages = {};
        this.packageConfigs = {};
        this.clientQuestionCallbacks = {};
    }
}
export class Entity {
}
export class mObject extends Entity {
}
export class Function extends Entity {
}
export class Form extends Entity {
    constructor(pack) {
        super();
        this.elems = [];
        this._ = { pack };
    }
}
export class FormDto {
    constructor() {
        this.breadcrumb = [];
        this.elems = [];
        this.toolbar = false;
        this.declarations = {};
    }
}
export class ObjectModifyState {
}
export var ObjectModifyType;
(function (ObjectModifyType) {
    ObjectModifyType[ObjectModifyType["Update"] = 1] = "Update";
    ObjectModifyType[ObjectModifyType["Insert"] = 2] = "Insert";
    ObjectModifyType[ObjectModifyType["Patch"] = 3] = "Patch";
    ObjectModifyType[ObjectModifyType["Delete"] = 4] = "Delete";
})(ObjectModifyType || (ObjectModifyType = {}));
export class Property {
}
export class Drive {
}
export class FunctionTestSample {
}
export class EntityLink {
}
export var ObjectViewType;
(function (ObjectViewType) {
    ObjectViewType[ObjectViewType["GridView"] = 1] = "GridView";
    ObjectViewType[ObjectViewType["DetailsView"] = 2] = "DetailsView";
    ObjectViewType[ObjectViewType["TreeView"] = 3] = "TreeView";
})(ObjectViewType || (ObjectViewType = {}));
export class Elem {
}
export class ErrorObject extends Error {
    constructor(code, message) {
        super();
        this.code = code;
        this.message = message;
        this.toString = () => {
            return `error (${this.code}) ${this.message || ""}`;
        };
    }
}
export class ChartSeries {
}
export class Access {
}
export class AccessItem {
}
export class Menu {
}
export class MenuItem {
}
export class Pair {
}
export class App {
}
export class SystemConfigPackage {
}
export class SystemConfig {
}
export class Enum {
}
export class EnumItem {
}
export class MultilangText {
}
export class SmsAccount {
}
export class EmailAccount {
}
export class PackageConfig {
}
export class PackageAddressRule {
}
export class File {
}
export class Text {
}
export class TimeZone {
}
export class RefPortion {
}
export class GeoLocation {
}
export class PutOptions {
}
export class PatchOptions {
}
export class DelOptions {
}
export class GetOptions {
}
export var StatusCode;
(function (StatusCode) {
    StatusCode[StatusCode["Ok"] = 200] = "Ok";
    StatusCode[StatusCode["Accepted"] = 202] = "Accepted";
    StatusCode[StatusCode["ResetContent"] = 205] = "ResetContent";
    StatusCode[StatusCode["MovedPermanently"] = 301] = "MovedPermanently";
    StatusCode[StatusCode["MovedTemporarily"] = 302] = "MovedTemporarily";
    StatusCode[StatusCode["BadRequest"] = 400] = "BadRequest";
    StatusCode[StatusCode["Unauthorized"] = 401] = "Unauthorized";
    StatusCode[StatusCode["PaymentRequired"] = 402] = "PaymentRequired";
    StatusCode[StatusCode["Forbidden"] = 403] = "Forbidden";
    StatusCode[StatusCode["NotFound"] = 404] = "NotFound";
    StatusCode[StatusCode["MethodNotAllowed"] = 405] = "MethodNotAllowed";
    StatusCode[StatusCode["NotAcceptable"] = 406] = "NotAcceptable";
    StatusCode[StatusCode["RequestTimeout"] = 408] = "RequestTimeout";
    StatusCode[StatusCode["Gone"] = 410] = "Gone";
    StatusCode[StatusCode["RequestEntityTooLarge"] = 413] = "RequestEntityTooLarge";
    StatusCode[StatusCode["RequestedRangeNotSatisfiable"] = 416] = "RequestedRangeNotSatisfiable";
    StatusCode[StatusCode["ExpectationFailed"] = 417] = "ExpectationFailed";
    StatusCode[StatusCode["UnprocessableEntity"] = 422] = "UnprocessableEntity";
    StatusCode[StatusCode["UpgradeRequired"] = 426] = "UpgradeRequired";
    StatusCode[StatusCode["PreconditionRequired"] = 428] = "PreconditionRequired";
    StatusCode[StatusCode["TooManyRequests"] = 429] = "TooManyRequests";
    StatusCode[StatusCode["UnavailableForLegalReasons"] = 451] = "UnavailableForLegalReasons";
    StatusCode[StatusCode["ServerError"] = 500] = "ServerError";
    StatusCode[StatusCode["NotImplemented"] = 501] = "NotImplemented";
    StatusCode[StatusCode["ServiceUnavailable"] = 503] = "ServiceUnavailable";
    StatusCode[StatusCode["NetworkAuthenticationRequired"] = 511] = "NetworkAuthenticationRequired";
    StatusCode[StatusCode["UnknownError"] = 1001] = "UnknownError";
    StatusCode[StatusCode["ConfigurationProblem"] = 1002] = "ConfigurationProblem";
})(StatusCode || (StatusCode = {}));
export class UploadedFile {
}
export var LogType;
(function (LogType) {
    LogType[LogType["Fatal"] = 0] = "Fatal";
    LogType[LogType["Error"] = 3] = "Error";
    LogType[LogType["Warning"] = 4] = "Warning";
    LogType[LogType["Info"] = 6] = "Info";
    LogType[LogType["Debug"] = 7] = "Debug";
    LogType[LogType["Silly"] = 8] = "Silly";
})(LogType || (LogType = {}));
export var LinkType;
(function (LinkType) {
    LinkType[LinkType["Auto"] = 0] = "Auto";
    LinkType[LinkType["Help"] = 1] = "Help";
})(LinkType || (LinkType = {}));
export var PanelType;
(function (PanelType) {
    PanelType[PanelType["Stack"] = 1] = "Stack";
    PanelType[PanelType["Dock"] = 2] = "Dock";
    // Grid = 3,
    PanelType[PanelType["Wrap"] = 4] = "Wrap";
    PanelType[PanelType["Flex"] = 5] = "Flex";
    PanelType[PanelType["Modal"] = 6] = "Modal";
})(PanelType || (PanelType = {}));
export var Orientation;
(function (Orientation) {
    Orientation[Orientation["Horizontal"] = 1] = "Horizontal";
    Orientation[Orientation["Vertical"] = 2] = "Vertical";
})(Orientation || (Orientation = {}));
export var ElemType;
(function (ElemType) {
    ElemType[ElemType["Text"] = 1] = "Text";
    ElemType[ElemType["Panel"] = 2] = "Panel";
    ElemType[ElemType["Property"] = 3] = "Property";
    ElemType[ElemType["Object"] = 4] = "Object";
    ElemType[ElemType["Function"] = 5] = "Function";
    ElemType[ElemType["Image"] = 6] = "Image";
    ElemType[ElemType["Map"] = 7] = "Map";
    ElemType[ElemType["Chart"] = 8] = "Chart";
    ElemType[ElemType["Viewer"] = 9] = "Viewer";
    ElemType[ElemType["Component"] = 10] = "Component";
    ElemType[ElemType["Tree"] = 11] = "Tree";
    ElemType[ElemType["Document"] = 12] = "Document";
    ElemType[ElemType["View"] = 13] = "View";
})(ElemType || (ElemType = {}));
export var EntityType;
(function (EntityType) {
    EntityType[EntityType["Object"] = 1] = "Object";
    EntityType[EntityType["Function"] = 2] = "Function";
    EntityType[EntityType["Form"] = 3] = "Form";
    EntityType[EntityType["File"] = 4] = "File";
})(EntityType || (EntityType = {}));
export var AccessPermission;
(function (AccessPermission) {
    AccessPermission[AccessPermission["None"] = 0] = "None";
    AccessPermission[AccessPermission["View"] = 1] = "View";
    AccessPermission[AccessPermission["NewItem"] = 2] = "NewItem";
    AccessPermission[AccessPermission["DeleteItem"] = 3] = "DeleteItem";
    AccessPermission[AccessPermission["Edit"] = 4] = "Edit";
    AccessPermission[AccessPermission["Full"] = 8] = "Full";
})(AccessPermission || (AccessPermission = {}));
export var PropertyViewMode;
(function (PropertyViewMode) {
    PropertyViewMode[PropertyViewMode["Visible"] = 0] = "Visible";
    PropertyViewMode[PropertyViewMode["DetailViewVisible"] = 1] = "DetailViewVisible";
    PropertyViewMode[PropertyViewMode["Hidden"] = 2] = "Hidden";
})(PropertyViewMode || (PropertyViewMode = {}));
export var PropertyEditMode;
(function (PropertyEditMode) {
    PropertyEditMode[PropertyEditMode["Readonly"] = 3] = "Readonly";
    PropertyEditMode[PropertyEditMode["OnceOnly"] = 4] = "OnceOnly";
})(PropertyEditMode || (PropertyEditMode = {}));
export var Keys;
(function (Keys) {
    Keys[Keys["left"] = 37] = "left";
    Keys[Keys["right"] = 39] = "right";
    Keys[Keys["up"] = 38] = "up";
    Keys[Keys["down"] = 40] = "down";
    Keys[Keys["enter"] = 13] = "enter";
    Keys[Keys["esc"] = 27] = "esc";
    Keys[Keys["tab"] = 9] = "tab";
    Keys[Keys["del"] = 46] = "del";
    Keys[Keys["backspace"] = 8] = "backspace";
    Keys[Keys["shift"] = 16] = "shift";
    Keys[Keys["ctrl"] = 17] = "ctrl";
    Keys[Keys["alt"] = 18] = "alt";
    Keys[Keys["space"] = 32] = "space";
    Keys[Keys["f1"] = 112] = "f1";
    Keys[Keys["f2"] = 113] = "f2";
    Keys[Keys["f3"] = 114] = "f3";
    Keys[Keys["f4"] = 115] = "f4";
    Keys[Keys["f5"] = 116] = "f5";
    Keys[Keys["f6"] = 117] = "f6";
    Keys[Keys["f7"] = 118] = "f7";
    Keys[Keys["f8"] = 119] = "f8";
    Keys[Keys["f9"] = 120] = "f9";
    Keys[Keys["f10"] = 121] = "f10";
    Keys[Keys["f11"] = 122] = "f11";
    Keys[Keys["f12"] = 123] = "f12";
    Keys[Keys["s"] = 83] = "s";
    Keys[Keys["t"] = 84] = "t";
    Keys[Keys["u"] = 85] = "u";
    Keys[Keys["v"] = 86] = "v";
    Keys[Keys["w"] = 87] = "w";
    Keys[Keys["x"] = 88] = "x";
    Keys[Keys["y"] = 89] = "y";
    Keys[Keys["z"] = 90] = "z";
    Keys[Keys["m"] = 77] = "m";
    Keys[Keys["q"] = 81] = "q";
    Keys[Keys["num_8"] = 104] = "num_8";
    Keys[Keys["num_2"] = 98] = "num_2";
})(Keys || (Keys = {}));
export var Locale;
(function (Locale) {
    Locale[Locale["en"] = 1033] = "en";
    Locale[Locale["ar"] = 1025] = "ar";
    Locale[Locale["fa"] = 1065] = "fa";
    Locale[Locale["fr"] = 1036] = "fr";
    Locale[Locale["de"] = 1031] = "de";
    Locale[Locale["it"] = 1040] = "it";
    Locale[Locale["ru"] = 1049] = "ru";
    Locale[Locale["sl"] = 1060] = "sl";
    Locale[Locale["tr"] = 1055] = "tr";
    Locale[Locale["pt"] = 1046] = "pt";
    Locale[Locale["zh"] = 2052] = "zh";
    Locale[Locale["es"] = 3082] = "es";
    Locale[Locale["hi"] = 1081] = "hi";
    Locale[Locale["ja"] = 1041] = "ja";
    Locale[Locale["ko"] = 1042] = "ko";
})(Locale || (Locale = {}));
export var SourceType;
(function (SourceType) {
    SourceType[SourceType["Db"] = 1] = "Db";
    SourceType[SourceType["File"] = 2] = "File";
    SourceType[SourceType["Memory"] = 3] = "Memory";
    SourceType[SourceType["Redis"] = 4] = "Redis";
    SourceType[SourceType["Ftp"] = 5] = "Ftp";
    SourceType[SourceType["Rest"] = 6] = "Rest";
    SourceType[SourceType["Soap"] = 7] = "Soap";
    SourceType[SourceType["Kafka"] = 8] = "Kafka";
    SourceType[SourceType["S3"] = 9] = "S3";
})(SourceType || (SourceType = {}));
export var FunctionMode;
(function (FunctionMode) {
    FunctionMode[FunctionMode["OpenDialog"] = 1] = "OpenDialog";
    FunctionMode[FunctionMode["OpenPage"] = 2] = "OpenPage";
    FunctionMode[FunctionMode["Run"] = 3] = "Run";
})(FunctionMode || (FunctionMode = {}));
export var ChangeFrequency;
(function (ChangeFrequency) {
    ChangeFrequency[ChangeFrequency["always"] = 1] = "always";
    ChangeFrequency[ChangeFrequency["hourly"] = 2] = "hourly";
    ChangeFrequency[ChangeFrequency["daily"] = 3] = "daily";
    ChangeFrequency[ChangeFrequency["weekly"] = 4] = "weekly";
    ChangeFrequency[ChangeFrequency["monthly"] = 5] = "monthly";
    ChangeFrequency[ChangeFrequency["yearly"] = 6] = "yearly";
    ChangeFrequency[ChangeFrequency["never"] = 7] = "never";
})(ChangeFrequency || (ChangeFrequency = {}));
export var NewItemMode;
(function (NewItemMode) {
    NewItemMode[NewItemMode["inline"] = 0] = "inline";
    NewItemMode[NewItemMode["newPage"] = 1] = "newPage";
    NewItemMode[NewItemMode["modal"] = 2] = "modal";
})(NewItemMode || (NewItemMode = {}));
export var PropertyReferType;
(function (PropertyReferType) {
    PropertyReferType[PropertyReferType["inlineData"] = 9] = "inlineData";
    PropertyReferType[PropertyReferType["outbound"] = 5] = "outbound";
    PropertyReferType[PropertyReferType["select"] = 10] = "select";
})(PropertyReferType || (PropertyReferType = {}));
export var GlobalType;
(function (GlobalType) {
    GlobalType[GlobalType["unknown"] = 0] = "unknown";
    GlobalType[GlobalType["number"] = 1] = "number";
    GlobalType[GlobalType["string"] = 2] = "string";
    GlobalType[GlobalType["boolean"] = 3] = "boolean";
    GlobalType[GlobalType["time"] = 4] = "time";
    GlobalType[GlobalType["location"] = 5] = "location";
    GlobalType[GlobalType["id"] = 6] = "id";
    GlobalType[GlobalType["object"] = 7] = "object";
    GlobalType[GlobalType["file"] = 8] = "file";
})(GlobalType || (GlobalType = {}));
export var RefPortionType;
(function (RefPortionType) {
    RefPortionType[RefPortionType["entity"] = 1] = "entity";
    RefPortionType[RefPortionType["property"] = 2] = "property";
    RefPortionType[RefPortionType["item"] = 3] = "item";
    RefPortionType[RefPortionType["file"] = 4] = "file";
})(RefPortionType || (RefPortionType = {}));
export var TimeFormat;
(function (TimeFormat) {
    TimeFormat[TimeFormat["yearMonthDayHourMinute"] = 1] = "yearMonthDayHourMinute";
    TimeFormat[TimeFormat["hourMinute"] = 2] = "hourMinute";
    TimeFormat[TimeFormat["dateWithDayOfWeek"] = 3] = "dateWithDayOfWeek";
    TimeFormat[TimeFormat["friendlyDate"] = 4] = "friendlyDate";
})(TimeFormat || (TimeFormat = {}));
export var ObjectReferType;
(function (ObjectReferType) {
    ObjectReferType[ObjectReferType["similar"] = 0] = "similar";
    ObjectReferType[ObjectReferType["filter"] = 1] = "filter";
    ObjectReferType[ObjectReferType["aggregate"] = 2] = "aggregate";
    ObjectReferType[ObjectReferType["value"] = 3] = "value";
})(ObjectReferType || (ObjectReferType = {}));
export var RedirectType;
(function (RedirectType) {
    RedirectType[RedirectType["Permanent"] = 0] = "Permanent";
})(RedirectType || (RedirectType = {}));
export var SysCollection;
(function (SysCollection) {
    SysCollection["audits"] = "audits";
    SysCollection["users"] = "users";
    SysCollection["dictionary"] = "dictionary";
    SysCollection["objects"] = "objects";
    SysCollection["functions"] = "functions";
    SysCollection["roles"] = "roles";
    SysCollection["packageConfig"] = "packageConfig";
    SysCollection["systemConfig"] = "systemConfig";
    SysCollection["menus"] = "menus";
    SysCollection["drives"] = "drives";
    SysCollection["forms"] = "forms";
    SysCollection["auditTypes"] = "auditTypes";
    SysCollection["enums"] = "enums";
})(SysCollection || (SysCollection = {}));
export var SysAuditTypes;
(function (SysAuditTypes) {
    SysAuditTypes["addItem"] = "5d7b8fbd10f5321b74a1b83b";
    SysAuditTypes["edit"] = "5d7b91d410f5321b74a1b83c";
    SysAuditTypes["deleteItem"] = "5d7b91e810f5321b74a1b83d";
    SysAuditTypes["login"] = "5d7b91f710f5321b74a1b83e";
    SysAuditTypes["logout"] = "5d7b920410f5321b74a1b83f";
    SysAuditTypes["start"] = "5d7b920d10f5321b74a1b840";
    SysAuditTypes["stop"] = "5d7b921b10f5321b74a1b841";
    SysAuditTypes["uncaughtException"] = "5d7b922910f5321b74a1b842";
    SysAuditTypes["unhandledRejection"] = "5d7b923510f5321b74a1b843";
    SysAuditTypes["tryNotAllowedModify"] = "5d7b920d10f5321b74a1b840";
})(SysAuditTypes || (SysAuditTypes = {}));
export var SystemProperty;
(function (SystemProperty) {
    SystemProperty["title"] = "title";
    SystemProperty["name"] = "name";
    SystemProperty["time"] = "time";
    SystemProperty["comment"] = "comment";
})(SystemProperty || (SystemProperty = {}));
export class EmbeddedInfo {
}
export var PType;
(function (PType) {
    PType["text"] = "589f2d8bb16c7523543ae1b0";
    PType["number"] = "589f2d8bb16c7523543ae1b3";
    PType["boolean"] = "589f2d8bb16c7523543ae1b9";
    PType["time"] = "589f2d8bb16c7523543ae1b6";
    PType["reference"] = "589f2d8bb16c7523543ae1cb";
    PType["location"] = "58a18d9c70c25e0c30930287";
    PType["file"] = "589f2d8bb16c7523543ae1c2";
    PType["obj"] = "5e2562d9a3c257129832b75f";
})(PType || (PType = {}));
export var GridRowHeaderStyle;
(function (GridRowHeaderStyle) {
    GridRowHeaderStyle[GridRowHeaderStyle["index"] = 0] = "index";
    GridRowHeaderStyle[GridRowHeaderStyle["empty"] = 1] = "empty";
    GridRowHeaderStyle[GridRowHeaderStyle["select"] = 2] = "select";
})(GridRowHeaderStyle || (GridRowHeaderStyle = {}));
export const Constants = {
    urlPortionApi: "api",
    sysPackage: "sys",
    indexProperty: "_z",
    defaultLoginUri: 'login',
    amazonS3ApiVersion: "2006-03-01",
    mongodbPoolSize: 10,
    mainDbSourceName: "db",
    systemPropertiesObjectName: "systemProperties",
    timeZonesCollection: "timeZones",
};
export var PropertyConditionBehavior;
(function (PropertyConditionBehavior) {
    PropertyConditionBehavior[PropertyConditionBehavior["Visible"] = 1] = "Visible";
    PropertyConditionBehavior[PropertyConditionBehavior["Enable"] = 2] = "Enable";
})(PropertyConditionBehavior || (PropertyConditionBehavior = {}));
export var DefaultPermission;
(function (DefaultPermission) {
    DefaultPermission[DefaultPermission["None"] = 0] = "None";
    DefaultPermission[DefaultPermission["View"] = 1] = "View";
    DefaultPermission[DefaultPermission["Full"] = 8] = "Full";
})(DefaultPermission || (DefaultPermission = {}));
export var EnvMode;
(function (EnvMode) {
    EnvMode["Development"] = "development";
    EnvMode["Production"] = "production";
})(EnvMode || (EnvMode = {}));
export var RequestMode;
(function (RequestMode) {
    RequestMode[RequestMode["inline"] = 1] = "inline";
    RequestMode[RequestMode["download"] = 2] = "download";
    RequestMode[RequestMode["api"] = 3] = "api";
    RequestMode[RequestMode["inlineDev"] = 4] = "inlineDev";
})(RequestMode || (RequestMode = {}));
export class WebResponse {
}
export class AppStateConfig {
    constructor() {
        this.version = "";
        this.appTitle = "";
        this.brandingLogo = "";
        this.locale = "";
        this.appLocales = [];
        this.loginRef = "";
        this.loginTitle = "";
        this.interactive = false;
        this.menu = [];
        this.navmenu = [];
    }
}
export var WebMethod;
(function (WebMethod) {
    WebMethod["get"] = "GET";
    WebMethod["post"] = "POST";
    WebMethod["put"] = "PUT";
    WebMethod["patch"] = "PATCH";
    WebMethod["del"] = "DELETE";
})(WebMethod || (WebMethod = {}));
export class UnitTestObject {
}
export var DriveMode;
(function (DriveMode) {
    DriveMode[DriveMode["Gallery"] = 1] = "Gallery";
    DriveMode[DriveMode["NonSelectable"] = 2] = "NonSelectable";
})(DriveMode || (DriveMode = {}));
export var DirFileType;
(function (DirFileType) {
    DirFileType[DirFileType["File"] = 1] = "File";
    DirFileType[DirFileType["Folder"] = 2] = "Folder";
})(DirFileType || (DirFileType = {}));
export class DirFile {
}
export var ClientCommand;
(function (ClientCommand) {
    ClientCommand[ClientCommand["Notification"] = 1] = "Notification";
    ClientCommand[ClientCommand["Log"] = 2] = "Log";
    ClientCommand[ClientCommand["Question"] = 3] = "Question";
    ClientCommand[ClientCommand["Answer"] = 4] = "Answer";
    ClientCommand[ClientCommand["FunctionDone"] = 5] = "FunctionDone";
    ClientCommand[ClientCommand["FunctionFailed"] = 6] = "FunctionFailed";
    ClientCommand[ClientCommand["Ping"] = 7] = "Ping";
    ClientCommand[ClientCommand["PingAck"] = 8] = "PingAck";
    ClientCommand[ClientCommand["Download"] = 9] = "Download";
})(ClientCommand || (ClientCommand = {}));
export var ObjectDetailsViewType;
(function (ObjectDetailsViewType) {
    ObjectDetailsViewType[ObjectDetailsViewType["Grouped"] = 1] = "Grouped";
    ObjectDetailsViewType[ObjectDetailsViewType["Tabular"] = 2] = "Tabular";
    ObjectDetailsViewType[ObjectDetailsViewType["Simple"] = 3] = "Simple";
    ObjectDetailsViewType[ObjectDetailsViewType["Wizard"] = 4] = "Wizard";
})(ObjectDetailsViewType || (ObjectDetailsViewType = {}));
export var ObjectListsViewType;
(function (ObjectListsViewType) {
    ObjectListsViewType[ObjectListsViewType["Grid"] = 1] = "Grid";
    ObjectListsViewType[ObjectListsViewType["Card"] = 2] = "Card";
    ObjectListsViewType[ObjectListsViewType["Column"] = 3] = "Column";
})(ObjectListsViewType || (ObjectListsViewType = {}));
export var YesNo;
(function (YesNo) {
    YesNo[YesNo["Yes"] = 1] = "Yes";
    YesNo[YesNo["No"] = 2] = "No";
})(YesNo || (YesNo = {}));
export class Context {
}
export class AjaxConfig {
}
export class NotificationInfo {
}
export class ComponentParams {
}
export var ItemState;
(function (ItemState) {
    ItemState[ItemState["Default"] = 0] = "Default";
    ItemState[ItemState["Updated"] = 1] = "Updated";
    ItemState[ItemState["Inserted"] = 2] = "Inserted";
    ItemState[ItemState["Deleted"] = 4] = "Deleted";
})(ItemState || (ItemState = {}));
export class EntityMeta {
}
export class ObjectDec {
}
export class FunctionDec {
}
export var ReqParams;
(function (ReqParams) {
    ReqParams["query"] = "q";
    ReqParams["version"] = "v";
    ReqParams["locale"] = "e";
    ReqParams["page"] = "p";
    ReqParams["cache"] = "c";
    ReqParams["sort"] = "s";
    ReqParams["mode"] = "m";
    ReqParams["functionType"] = "f";
})(ReqParams || (ReqParams = {}));
//# sourceMappingURL=types.js.map