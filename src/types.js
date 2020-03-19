"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var AuditArgs = (function () {
    function AuditArgs() {
    }
    return AuditArgs;
}());
exports.AuditArgs = AuditArgs;
var Role = (function () {
    function Role() {
    }
    return Role;
}());
exports.Role = Role;
var User = (function () {
    function User() {
        this.roles = [];
        this.disabled = false;
    }
    return User;
}());
exports.User = User;
var AuditType = (function () {
    function AuditType() {
    }
    return AuditType;
}());
exports.AuditType = AuditType;
var Global = (function () {
    function Global() {
        this.dbs = [];
        this.packages = {};
        this.packageConfigs = {};
        this.clientQuestionCallbacks = {};
    }
    return Global;
}());
exports.Global = Global;
var Entity = (function () {
    function Entity() {
        this._access = { "sys": {} };
    }
    return Entity;
}());
exports.Entity = Entity;
var mObject = (function (_super) {
    __extends(mObject, _super);
    function mObject() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return mObject;
}(Entity));
exports.mObject = mObject;
var ObjectModifyState = (function () {
    function ObjectModifyState() {
    }
    return ObjectModifyState;
}());
exports.ObjectModifyState = ObjectModifyState;
var ObjectModifyType;
(function (ObjectModifyType) {
    ObjectModifyType[ObjectModifyType["Update"] = 1] = "Update";
    ObjectModifyType[ObjectModifyType["Insert"] = 2] = "Insert";
    ObjectModifyType[ObjectModifyType["Patch"] = 3] = "Patch";
    ObjectModifyType[ObjectModifyType["Delete"] = 4] = "Delete";
})(ObjectModifyType = exports.ObjectModifyType || (exports.ObjectModifyType = {}));
var Property = (function () {
    function Property() {
    }
    return Property;
}());
exports.Property = Property;
var Drive = (function () {
    function Drive() {
    }
    return Drive;
}());
exports.Drive = Drive;
var Function = (function (_super) {
    __extends(Function, _super);
    function Function() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return Function;
}(Entity));
exports.Function = Function;
var FunctionTestSample = (function () {
    function FunctionTestSample() {
    }
    return FunctionTestSample;
}());
exports.FunctionTestSample = FunctionTestSample;
var EntityLink = (function () {
    function EntityLink() {
    }
    return EntityLink;
}());
exports.EntityLink = EntityLink;
var Form = (function (_super) {
    __extends(Form, _super);
    function Form() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.elems = [];
        return _this;
    }
    return Form;
}(Entity));
exports.Form = Form;
var ObjectViewType;
(function (ObjectViewType) {
    ObjectViewType[ObjectViewType["GridView"] = 1] = "GridView";
    ObjectViewType[ObjectViewType["DetailsView"] = 2] = "DetailsView";
    ObjectViewType[ObjectViewType["TreeView"] = 3] = "TreeView";
})(ObjectViewType = exports.ObjectViewType || (exports.ObjectViewType = {}));
var Elem = (function () {
    function Elem() {
    }
    return Elem;
}());
exports.Elem = Elem;
var ErrorObject = (function (_super) {
    __extends(ErrorObject, _super);
    function ErrorObject(code, message) {
        var _this = _super.call(this) || this;
        _this.code = code;
        _this.message = message;
        _this.toString = function () {
            return "error (" + _this.code + ") " + (_this.message || "");
        };
        return _this;
    }
    return ErrorObject;
}(Error));
exports.ErrorObject = ErrorObject;
var ChartSeries = (function () {
    function ChartSeries() {
    }
    return ChartSeries;
}());
exports.ChartSeries = ChartSeries;
var PackageMeta = (function () {
    function PackageMeta() {
    }
    return PackageMeta;
}());
exports.PackageMeta = PackageMeta;
var Access = (function () {
    function Access() {
    }
    return Access;
}());
exports.Access = Access;
var AccessItem = (function () {
    function AccessItem() {
    }
    return AccessItem;
}());
exports.AccessItem = AccessItem;
var Menu = (function () {
    function Menu() {
    }
    return Menu;
}());
exports.Menu = Menu;
var MenuItem = (function () {
    function MenuItem() {
    }
    return MenuItem;
}());
exports.MenuItem = MenuItem;
var Pair = (function () {
    function Pair() {
    }
    return Pair;
}());
exports.Pair = Pair;
var App = (function () {
    function App() {
    }
    return App;
}());
exports.App = App;
var SystemConfigPackage = (function () {
    function SystemConfigPackage() {
    }
    return SystemConfigPackage;
}());
exports.SystemConfigPackage = SystemConfigPackage;
var SystemConfig = (function () {
    function SystemConfig() {
    }
    return SystemConfig;
}());
exports.SystemConfig = SystemConfig;
var Enum = (function () {
    function Enum() {
    }
    return Enum;
}());
exports.Enum = Enum;
var EnumItem = (function () {
    function EnumItem() {
    }
    return EnumItem;
}());
exports.EnumItem = EnumItem;
var MultilangText = (function () {
    function MultilangText() {
    }
    return MultilangText;
}());
exports.MultilangText = MultilangText;
var SmsAccount = (function () {
    function SmsAccount() {
    }
    return SmsAccount;
}());
exports.SmsAccount = SmsAccount;
var EmailAccount = (function () {
    function EmailAccount() {
    }
    return EmailAccount;
}());
exports.EmailAccount = EmailAccount;
var PackageConfig = (function () {
    function PackageConfig() {
    }
    return PackageConfig;
}());
exports.PackageConfig = PackageConfig;
var PackageAddressRule = (function () {
    function PackageAddressRule() {
    }
    return PackageAddressRule;
}());
exports.PackageAddressRule = PackageAddressRule;
var FileInfo = (function () {
    function FileInfo() {
    }
    return FileInfo;
}());
exports.FileInfo = FileInfo;
var Text = (function () {
    function Text() {
    }
    return Text;
}());
exports.Text = Text;
var TimeZone = (function () {
    function TimeZone() {
    }
    return TimeZone;
}());
exports.TimeZone = TimeZone;
var RefPortion = (function () {
    function RefPortion() {
    }
    return RefPortion;
}());
exports.RefPortion = RefPortion;
var GeoLocation = (function () {
    function GeoLocation() {
    }
    return GeoLocation;
}());
exports.GeoLocation = GeoLocation;
var PutOptions = (function () {
    function PutOptions() {
    }
    return PutOptions;
}());
exports.PutOptions = PutOptions;
var PatchOptions = (function () {
    function PatchOptions() {
    }
    return PatchOptions;
}());
exports.PatchOptions = PatchOptions;
var DelOptions = (function () {
    function DelOptions() {
    }
    return DelOptions;
}());
exports.DelOptions = DelOptions;
var GetOptions = (function () {
    function GetOptions() {
    }
    return GetOptions;
}());
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
var ChangeFrequecy;
(function (ChangeFrequecy) {
    ChangeFrequecy[ChangeFrequecy["always"] = 1] = "always";
    ChangeFrequecy[ChangeFrequecy["hourly"] = 2] = "hourly";
    ChangeFrequecy[ChangeFrequecy["daily"] = 3] = "daily";
    ChangeFrequecy[ChangeFrequecy["weekly"] = 4] = "weekly";
    ChangeFrequecy[ChangeFrequecy["monthly"] = 5] = "monthly";
    ChangeFrequecy[ChangeFrequecy["yearly"] = 6] = "yearly";
    ChangeFrequecy[ChangeFrequecy["never"] = 7] = "never";
})(ChangeFrequecy = exports.ChangeFrequecy || (exports.ChangeFrequecy = {}));
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
var EmbeddedInfo = (function () {
    function EmbeddedInfo() {
    }
    return EmbeddedInfo;
}());
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
    amazonS3ApiVersion: "2006-03-01",
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
var WebResponse = (function () {
    function WebResponse() {
        this.data = {};
        this.meta = {};
        this.menu = [];
        this.navmenu = [];
    }
    return WebResponse;
}());
exports.WebResponse = WebResponse;
var WebMethod;
(function (WebMethod) {
    WebMethod["get"] = "GET";
    WebMethod["post"] = "POST";
    WebMethod["put"] = "PUT";
    WebMethod["patch"] = "PATCH";
    WebMethod["del"] = "DELETE";
})(WebMethod = exports.WebMethod || (exports.WebMethod = {}));
var UnitTestObject = (function () {
    function UnitTestObject() {
    }
    return UnitTestObject;
}());
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
var DirFile = (function () {
    function DirFile() {
    }
    return DirFile;
}());
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
//# sourceMappingURL=types.js.map