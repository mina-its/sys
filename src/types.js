"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class AuditArgs {
}
exports.AuditArgs = AuditArgs;
class Role {
}
exports.Role = Role;
class User {
    constructor() {
        this.roles = [];
        this.disabled = false;
    }
}
exports.User = User;
class AuditType {
}
exports.AuditType = AuditType;
class Global {
    constructor() {
        this.dbs = [];
        this.packages = {};
        this.packageConfigs = {};
        this.clientQuestionCallbacks = {};
    }
}
exports.Global = Global;
class Entity {
}
exports.Entity = Entity;
class mObject extends Entity {
}
exports.mObject = mObject;
class Function extends Entity {
}
exports.Function = Function;
class Form extends Entity {
    constructor() {
        super(...arguments);
        this.elems = [];
    }
}
exports.Form = Form;
class ObjectModifyState {
}
exports.ObjectModifyState = ObjectModifyState;
var ObjectModifyType;
(function (ObjectModifyType) {
    ObjectModifyType[ObjectModifyType["Update"] = 1] = "Update";
    ObjectModifyType[ObjectModifyType["Insert"] = 2] = "Insert";
    ObjectModifyType[ObjectModifyType["Patch"] = 3] = "Patch";
    ObjectModifyType[ObjectModifyType["Delete"] = 4] = "Delete";
})(ObjectModifyType = exports.ObjectModifyType || (exports.ObjectModifyType = {}));
class Property {
}
exports.Property = Property;
class Drive {
}
exports.Drive = Drive;
class FunctionTestSample {
}
exports.FunctionTestSample = FunctionTestSample;
class EntityLink {
}
exports.EntityLink = EntityLink;
var ObjectViewType;
(function (ObjectViewType) {
    ObjectViewType[ObjectViewType["GridView"] = 1] = "GridView";
    ObjectViewType[ObjectViewType["DetailsView"] = 2] = "DetailsView";
    ObjectViewType[ObjectViewType["TreeView"] = 3] = "TreeView";
})(ObjectViewType = exports.ObjectViewType || (exports.ObjectViewType = {}));
class Elem {
}
exports.Elem = Elem;
class ErrorObject extends Error {
    constructor(code, message) {
        super();
        this.code = code;
        this.message = message;
        this.toString = () => {
            return `error (${this.code}) ${this.message || ""}`;
        };
    }
}
exports.ErrorObject = ErrorObject;
class ChartSeries {
}
exports.ChartSeries = ChartSeries;
class Access {
}
exports.Access = Access;
class AccessItem {
}
exports.AccessItem = AccessItem;
class Menu {
}
exports.Menu = Menu;
class MenuItem {
}
exports.MenuItem = MenuItem;
class Pair {
}
exports.Pair = Pair;
class App {
}
exports.App = App;
class SystemConfigPackage {
}
exports.SystemConfigPackage = SystemConfigPackage;
class SystemConfig {
}
exports.SystemConfig = SystemConfig;
class Enum {
}
exports.Enum = Enum;
class EnumItem {
}
exports.EnumItem = EnumItem;
class MultilangText {
}
exports.MultilangText = MultilangText;
class SmsAccount {
}
exports.SmsAccount = SmsAccount;
class EmailAccount {
}
exports.EmailAccount = EmailAccount;
class PackageConfig {
}
exports.PackageConfig = PackageConfig;
class PackageAddressRule {
}
exports.PackageAddressRule = PackageAddressRule;
class File {
}
exports.File = File;
class Text {
}
exports.Text = Text;
class TimeZone {
}
exports.TimeZone = TimeZone;
class RefPortion {
}
exports.RefPortion = RefPortion;
class GeoLocation {
}
exports.GeoLocation = GeoLocation;
class PutOptions {
}
exports.PutOptions = PutOptions;
class PatchOptions {
}
exports.PatchOptions = PatchOptions;
class DelOptions {
}
exports.DelOptions = DelOptions;
class GetOptions {
}
exports.GetOptions = GetOptions;
var StatusCode;
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
})(StatusCode = exports.StatusCode || (exports.StatusCode = {}));
class UploadedFile {
}
exports.UploadedFile = UploadedFile;
var LogType;
(function (LogType) {
    LogType[LogType["Fatal"] = 0] = "Fatal";
    LogType[LogType["Error"] = 3] = "Error";
    LogType[LogType["Warning"] = 4] = "Warning";
    LogType[LogType["Info"] = 6] = "Info";
    LogType[LogType["Debug"] = 7] = "Debug";
    LogType[LogType["Silly"] = 8] = "Silly";
})(LogType = exports.LogType || (exports.LogType = {}));
var LinkType;
(function (LinkType) {
    LinkType[LinkType["Auto"] = 0] = "Auto";
    LinkType[LinkType["Help"] = 1] = "Help";
})(LinkType = exports.LinkType || (exports.LinkType = {}));
var PanelType;
(function (PanelType) {
    PanelType[PanelType["Stack"] = 1] = "Stack";
    PanelType[PanelType["Dock"] = 2] = "Dock";
    PanelType[PanelType["Wrap"] = 4] = "Wrap";
    PanelType[PanelType["Flex"] = 5] = "Flex";
    PanelType[PanelType["Modal"] = 6] = "Modal";
})(PanelType = exports.PanelType || (exports.PanelType = {}));
var Orientation;
(function (Orientation) {
    Orientation[Orientation["Horizontal"] = 1] = "Horizontal";
    Orientation[Orientation["Vertical"] = 2] = "Vertical";
})(Orientation = exports.Orientation || (exports.Orientation = {}));
var ElemType;
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
})(ElemType = exports.ElemType || (exports.ElemType = {}));
var EntityType;
(function (EntityType) {
    EntityType[EntityType["Object"] = 1] = "Object";
    EntityType[EntityType["Function"] = 2] = "Function";
    EntityType[EntityType["Form"] = 3] = "Form";
    EntityType[EntityType["File"] = 4] = "File";
})(EntityType = exports.EntityType || (exports.EntityType = {}));
var AccessPermission;
(function (AccessPermission) {
    AccessPermission[AccessPermission["None"] = 0] = "None";
    AccessPermission[AccessPermission["View"] = 1] = "View";
    AccessPermission[AccessPermission["NewItem"] = 2] = "NewItem";
    AccessPermission[AccessPermission["DeleteItem"] = 3] = "DeleteItem";
    AccessPermission[AccessPermission["Edit"] = 4] = "Edit";
    AccessPermission[AccessPermission["Full"] = 8] = "Full";
})(AccessPermission = exports.AccessPermission || (exports.AccessPermission = {}));
var PropertyViewMode;
(function (PropertyViewMode) {
    PropertyViewMode[PropertyViewMode["Visible"] = 0] = "Visible";
    PropertyViewMode[PropertyViewMode["DetailViewVisible"] = 1] = "DetailViewVisible";
    PropertyViewMode[PropertyViewMode["Hidden"] = 2] = "Hidden";
})(PropertyViewMode = exports.PropertyViewMode || (exports.PropertyViewMode = {}));
var PropertyEditMode;
(function (PropertyEditMode) {
    PropertyEditMode[PropertyEditMode["Readonly"] = 3] = "Readonly";
    PropertyEditMode[PropertyEditMode["OnceOnly"] = 4] = "OnceOnly";
})(PropertyEditMode = exports.PropertyEditMode || (exports.PropertyEditMode = {}));
var Keys;
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
})(Keys = exports.Keys || (exports.Keys = {}));
var Locale;
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
})(Locale = exports.Locale || (exports.Locale = {}));
var SourceType;
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
})(SourceType = exports.SourceType || (exports.SourceType = {}));
var FunctionMode;
(function (FunctionMode) {
    FunctionMode[FunctionMode["OpenDialog"] = 1] = "OpenDialog";
    FunctionMode[FunctionMode["OpenPage"] = 2] = "OpenPage";
    FunctionMode[FunctionMode["Run"] = 3] = "Run";
})(FunctionMode = exports.FunctionMode || (exports.FunctionMode = {}));
var ChangeFrequency;
(function (ChangeFrequency) {
    ChangeFrequency[ChangeFrequency["always"] = 1] = "always";
    ChangeFrequency[ChangeFrequency["hourly"] = 2] = "hourly";
    ChangeFrequency[ChangeFrequency["daily"] = 3] = "daily";
    ChangeFrequency[ChangeFrequency["weekly"] = 4] = "weekly";
    ChangeFrequency[ChangeFrequency["monthly"] = 5] = "monthly";
    ChangeFrequency[ChangeFrequency["yearly"] = 6] = "yearly";
    ChangeFrequency[ChangeFrequency["never"] = 7] = "never";
})(ChangeFrequency = exports.ChangeFrequency || (exports.ChangeFrequency = {}));
var NewItemMode;
(function (NewItemMode) {
    NewItemMode[NewItemMode["inline"] = 0] = "inline";
    NewItemMode[NewItemMode["newPage"] = 1] = "newPage";
    NewItemMode[NewItemMode["modal"] = 2] = "modal";
})(NewItemMode = exports.NewItemMode || (exports.NewItemMode = {}));
var PropertyReferType;
(function (PropertyReferType) {
    PropertyReferType[PropertyReferType["inlineData"] = 9] = "inlineData";
    PropertyReferType[PropertyReferType["outbound"] = 5] = "outbound";
    PropertyReferType[PropertyReferType["select"] = 10] = "select";
})(PropertyReferType = exports.PropertyReferType || (exports.PropertyReferType = {}));
var GlobalType;
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
})(GlobalType = exports.GlobalType || (exports.GlobalType = {}));
var RefPortionType;
(function (RefPortionType) {
    RefPortionType[RefPortionType["entity"] = 1] = "entity";
    RefPortionType[RefPortionType["property"] = 2] = "property";
    RefPortionType[RefPortionType["item"] = 3] = "item";
    RefPortionType[RefPortionType["file"] = 4] = "file";
})(RefPortionType = exports.RefPortionType || (exports.RefPortionType = {}));
var TimeFormat;
(function (TimeFormat) {
    TimeFormat[TimeFormat["yearMonthDayHourMinute"] = 1] = "yearMonthDayHourMinute";
    TimeFormat[TimeFormat["hourMinute"] = 2] = "hourMinute";
    TimeFormat[TimeFormat["dateWithDayOfWeek"] = 3] = "dateWithDayOfWeek";
    TimeFormat[TimeFormat["friendlyDate"] = 4] = "friendlyDate";
})(TimeFormat = exports.TimeFormat || (exports.TimeFormat = {}));
var ObjectReferType;
(function (ObjectReferType) {
    ObjectReferType[ObjectReferType["similar"] = 0] = "similar";
    ObjectReferType[ObjectReferType["filter"] = 1] = "filter";
    ObjectReferType[ObjectReferType["aggregate"] = 2] = "aggregate";
    ObjectReferType[ObjectReferType["value"] = 3] = "value";
})(ObjectReferType = exports.ObjectReferType || (exports.ObjectReferType = {}));
var RedirectType;
(function (RedirectType) {
    RedirectType[RedirectType["Permanent"] = 0] = "Permanent";
})(RedirectType = exports.RedirectType || (exports.RedirectType = {}));
var SysCollection;
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
})(SysCollection = exports.SysCollection || (exports.SysCollection = {}));
var SysAuditTypes;
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
})(SysAuditTypes = exports.SysAuditTypes || (exports.SysAuditTypes = {}));
var SystemProperty;
(function (SystemProperty) {
    SystemProperty["title"] = "title";
    SystemProperty["name"] = "name";
    SystemProperty["time"] = "time";
    SystemProperty["comment"] = "comment";
})(SystemProperty = exports.SystemProperty || (exports.SystemProperty = {}));
class EmbeddedInfo {
}
exports.EmbeddedInfo = EmbeddedInfo;
var PType;
(function (PType) {
    PType["text"] = "589f2d8bb16c7523543ae1b0";
    PType["number"] = "589f2d8bb16c7523543ae1b3";
    PType["boolean"] = "589f2d8bb16c7523543ae1b9";
    PType["time"] = "589f2d8bb16c7523543ae1b6";
    PType["reference"] = "589f2d8bb16c7523543ae1cb";
    PType["location"] = "58a18d9c70c25e0c30930287";
    PType["file"] = "589f2d8bb16c7523543ae1c2";
    PType["obj"] = "5e2562d9a3c257129832b75f";
})(PType = exports.PType || (exports.PType = {}));
var GridRowHeaderStyle;
(function (GridRowHeaderStyle) {
    GridRowHeaderStyle[GridRowHeaderStyle["index"] = 0] = "index";
    GridRowHeaderStyle[GridRowHeaderStyle["empty"] = 1] = "empty";
    GridRowHeaderStyle[GridRowHeaderStyle["select"] = 2] = "select";
})(GridRowHeaderStyle = exports.GridRowHeaderStyle || (exports.GridRowHeaderStyle = {}));
exports.Constants = {
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
var PropertyConditionBehavior;
(function (PropertyConditionBehavior) {
    PropertyConditionBehavior[PropertyConditionBehavior["Visible"] = 1] = "Visible";
    PropertyConditionBehavior[PropertyConditionBehavior["Enable"] = 2] = "Enable";
})(PropertyConditionBehavior = exports.PropertyConditionBehavior || (exports.PropertyConditionBehavior = {}));
var DefaultPermission;
(function (DefaultPermission) {
    DefaultPermission[DefaultPermission["None"] = 0] = "None";
    DefaultPermission[DefaultPermission["View"] = 1] = "View";
    DefaultPermission[DefaultPermission["Full"] = 8] = "Full";
})(DefaultPermission = exports.DefaultPermission || (exports.DefaultPermission = {}));
var EnvMode;
(function (EnvMode) {
    EnvMode[EnvMode["Development"] = 1] = "Development";
    EnvMode[EnvMode["Production"] = 2] = "Production";
})(EnvMode = exports.EnvMode || (exports.EnvMode = {}));
var RequestMode;
(function (RequestMode) {
    RequestMode[RequestMode["normal"] = 0] = "normal";
    RequestMode[RequestMode["partial"] = 1] = "partial";
    RequestMode[RequestMode["download"] = 2] = "download";
    RequestMode[RequestMode["api"] = 3] = "api";
})(RequestMode = exports.RequestMode || (exports.RequestMode = {}));
class WebResponse {
    constructor() {
        this.data = {};
        this.meta = {};
    }
}
exports.WebResponse = WebResponse;
class AppStateConfig {
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
exports.AppStateConfig = AppStateConfig;
var WebMethod;
(function (WebMethod) {
    WebMethod["get"] = "GET";
    WebMethod["post"] = "POST";
    WebMethod["put"] = "PUT";
    WebMethod["patch"] = "PATCH";
    WebMethod["del"] = "DELETE";
})(WebMethod = exports.WebMethod || (exports.WebMethod = {}));
class UnitTestObject {
}
exports.UnitTestObject = UnitTestObject;
var DriveMode;
(function (DriveMode) {
    DriveMode[DriveMode["Gallery"] = 1] = "Gallery";
    DriveMode[DriveMode["NonSelectable"] = 2] = "NonSelectable";
})(DriveMode = exports.DriveMode || (exports.DriveMode = {}));
var DirFileType;
(function (DirFileType) {
    DirFileType[DirFileType["File"] = 1] = "File";
    DirFileType[DirFileType["Folder"] = 2] = "Folder";
})(DirFileType = exports.DirFileType || (exports.DirFileType = {}));
class DirFile {
}
exports.DirFile = DirFile;
var ClientCommand;
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
})(ClientCommand = exports.ClientCommand || (exports.ClientCommand = {}));
var ObjectDetailsViewType;
(function (ObjectDetailsViewType) {
    ObjectDetailsViewType[ObjectDetailsViewType["Grouped"] = 1] = "Grouped";
    ObjectDetailsViewType[ObjectDetailsViewType["Tabular"] = 2] = "Tabular";
    ObjectDetailsViewType[ObjectDetailsViewType["Simple"] = 3] = "Simple";
    ObjectDetailsViewType[ObjectDetailsViewType["Wizard"] = 4] = "Wizard";
})(ObjectDetailsViewType = exports.ObjectDetailsViewType || (exports.ObjectDetailsViewType = {}));
var ObjectListsViewType;
(function (ObjectListsViewType) {
    ObjectListsViewType[ObjectListsViewType["Grid"] = 1] = "Grid";
    ObjectListsViewType[ObjectListsViewType["Card"] = 2] = "Card";
    ObjectListsViewType[ObjectListsViewType["Column"] = 3] = "Column";
})(ObjectListsViewType = exports.ObjectListsViewType || (exports.ObjectListsViewType = {}));
var YesNo;
(function (YesNo) {
    YesNo[YesNo["Yes"] = 1] = "Yes";
    YesNo[YesNo["No"] = 2] = "No";
})(YesNo = exports.YesNo || (exports.YesNo = {}));
class Context {
}
exports.Context = Context;
class AjaxConfig {
}
exports.AjaxConfig = AjaxConfig;
class NotificationInfo {
}
exports.NotificationInfo = NotificationInfo;
class ComponentParams {
}
exports.ComponentParams = ComponentParams;
var ItemState;
(function (ItemState) {
    ItemState[ItemState["Default"] = 0] = "Default";
    ItemState[ItemState["Updated"] = 1] = "Updated";
    ItemState[ItemState["Inserted"] = 2] = "Inserted";
    ItemState[ItemState["Deleted"] = 4] = "Deleted";
})(ItemState = exports.ItemState || (exports.ItemState = {}));
class ItemMeta {
}
exports.ItemMeta = ItemMeta;
class ObjectDeclare {
}
exports.ObjectDeclare = ObjectDeclare;
class FunctionDeclare {
}
exports.FunctionDeclare = FunctionDeclare;
var ReqParams;
(function (ReqParams) {
    ReqParams["query"] = "q";
    ReqParams["version"] = "v";
    ReqParams["locale"] = "e";
    ReqParams["page"] = "p";
    ReqParams["cache"] = "c";
    ReqParams["sort"] = "s";
    ReqParams["mode"] = "m";
    ReqParams["functionType"] = "f";
})(ReqParams = exports.ReqParams || (exports.ReqParams = {}));
//# sourceMappingURL=types.js.map