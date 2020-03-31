import {ObjectId} from 'mongodb';

export interface Context {
    locale: Locale;
    pack?: string;
    req?: any;
    url?: URL;
}

export interface Reference extends ObjectId {

}

export class AuditArgs {
    detail?: any;
    comment?: string;
    level: LogType;
    pack?: string;
    type?: ObjectId;
    user?: ObjectId;
    time?: Date;
}

export class Role {
    _id: ObjectId;
    title: string | MultilangText;
    name: string;
    roles: ObjectId[];
    comment: string | MultilangText;
    _: {
        pack: string;
    };
}

export class User {
    _id: ObjectId;
    roles: ObjectId[] = [];
    disabled = false;

    email: string;
    password: string;
    title: string;
    passwordExpireTime: Date;
    mobile: string;
    lastOnline: Date;
    lastOffline: Date;
    time: Date;
    _: {
        pack: string;
        isOnline?: boolean;
    }
}

export class AuditType {
    _id: ObjectId;
    name: string;
    title: string | MultilangText;
    disabled: boolean
}

export class Global {
    postClientCommandCallback: (cn: Context, ...args: any[]) => void;
    sysConfig: SystemConfig;
    dbs: { [packAndCs: string]: any } = {}; // any not mongodb.Db because of client side reference
    packages: { [id: string]: any } = {};
    packageConfigs: { [pack: string]: PackageConfig; } = {};
    clientQuestionCallbacks: { [sessionId: string]: (answer: number | null) => void; } = {};
    rootDir: string;
    entities: Entity[];
    drives: Drive[];
    auditTypes: AuditType[];
    timeZones: TimeZone[];
    dictionary: { [id: string]: string | MultilangText };
    menus: Menu[];
    apps: App[];
    enums: Enum[];
    enumTexts: { [id: string]: any; };
    systemProperties: Property[];
    roles: Role[];
}

export class Entity {
    _id: ObjectId;
    title: string | MultilangText;
    name: string;
    comment: string | MultilangText;
    entityType: EntityType;
    access: Access;
    links: EntityLink[];
    _: IEntity;
    // 	{
    // 	access: { [id: string]: Access; } // = {"sys": {} as Access};
    // 	pack: string;
    // };
}

export class mObject extends Entity implements IProperties {
    properties: Property[];
    auditModify: boolean;
    isList: boolean;
    newItemMode: NewItemMode;
    reference: ObjectId;
    titleProperty: string;
    sortDefaultProperty: string;
    query: string;
    referType: ObjectReferType;
    source: SourceType;
    rowHeaderStyle: GridRowHeaderStyle;
    reorderable: boolean;
    modified: Reference;
    detailsViewType: ObjectDetailsViewType;
    listsViewType: ObjectListsViewType;
    _: {
        access?: { [id: string]: Access; };
        pack: string;
        autoSetInsertTime?: boolean;
        inited?: boolean;
    }
}

export class Function extends Entity implements IProperties {
    properties: Property[];
    mode: FunctionMode;
    clientSide: boolean;
    returnType: ObjectId;
    interactive: boolean;
    test: {
        mock: boolean;
        samples?: FunctionTestSample[];
    };
    _: IEntity
}

export class Form extends Entity {
    template: string;
    keywords: string;
    changeFrequency: ChangeFrequency;
    breadcrumb: Pair[];
    isPublic: boolean;
    locale: Locale;
    openGraph;
    elems: Elem[] = [];
    _: IEntity;

    constructor(pack) {
        super();
        this._ = {pack};
    }
}

export class FormDto {
    title: string;
    breadcrumb: Pair[];
    elems: Elem[] = [];
    toolbar?: boolean;
    dataset?: { [ref: string]: any; };
    declarations?: { [ref: string]: ObjectDec | FunctionDec; };
}

export class ObjectModifyState {
    type: ObjectModifyType;
    itemId?: ObjectId;
    item?: any;
}

export enum ObjectModifyType {
    Update = 1,
    Insert = 2,
    Patch = 3,
    Delete = 4,
}

export interface IEntity {
    access?: { [pack: string]: Access; };
    pack: string;
}

export interface IProperties {
    name: string;
    properties: Property[];
}

export class Property implements IProperties {
    _id;
    name: string;
    title;
    group;
    properties: Property[];
    comment: string;
    viewMode: PropertyViewMode;
    defaultValue: string;
    editMode: PropertyEditMode;
    required: boolean;
    type: ObjectId;
    access: Access;
    isList: boolean;
    locale: Locale;
    formula: string;
    referType: PropertyReferType;
    dependsOn: string;
    condition: string;
    conditionBehavior: PropertyConditionBehavior;
    reorderable: boolean;
    text: {
        markdown: boolean;
        multiLine: boolean;
        multiLanguage: boolean;
        password: boolean;
        isPhone: boolean;
        isEmail: boolean;
        isUrl: boolean;
        // isAddress: boolean;
        // autoLocale: boolean;
        // autoComplete: boolean;
    };
    file: {
        drive: Drive;
        preview: boolean;
        sizeLimit: number;
        path: string;
    };
    time: {
        format: TimeFormat;
        iSODate: boolean;
    };
    number: {
        // longInteger: boolean;
        float: boolean;
        digitGrouping: boolean;
    };
    reference: {
        // goToReferenceOption: boolean;
        // radioList: boolean;
        // buttonGroupList: boolean;
    };
    documentView: boolean;
    _z: number;

    _: {
        drive?: Drive
        gtype?: GlobalType;
        isRef?: boolean;
        enum?: Enum;
        ref?: string;
        items?: Pair[];
        parentPropertiesCompared?: boolean;
        sorted?: boolean;
    };
}

export class Drive {
    _id: ObjectId;
    title: string | MultilangText;
    type: SourceType;
    comment: string | MultilangText;
    address: string;
    access: Access;
    mode: DriveMode;
    uri: string;
    s3: {
        accessKeyId: string;
        secretAccessKey: string;
        _sdk: any;
    };
    _: {
        pack: string;
    }
}

export class FunctionTestSample {
    _id: ObjectId;
    title: string;
    input?: any;
    result?: any;
    message?: string;
    code?: StatusCode;
    time?: Date;
}

export class EntityLink {
    _id: ObjectId;
    address: ObjectId;
    title: string | MultilangText;
    comment: string | MultilangText;
    condition: string;
    type: LinkType;
}

export enum ObjectViewType {
    GridView = 1,
    DetailsView = 2,
    TreeView = 3
}

export class Elem {
    type: ElemType;
    comment?: string;
    styles?: string;
    title?: string;

    panel?: {
        type: PanelType;
        elems?: Elem[];
        stack?: {
            orientation: Orientation;
        };
        wrap?: {};
        modal?: {
            message: string;
        };
    };
    property?: {
        name: string;
        detailsView: boolean;
        entityRef: string;
    };
    obj?: {
        ref: string;
        type: ObjectViewType;
        props?: {
            name: string;
            viewType: ObjectViewType;
            entityRef: string;
        }[];
    };
    func?: {
        ref: any;
        clientSide: boolean;
        exec?
    };
    image?: {
        ref: string;
    };
    map?: {
        location: any
    };
    view?: {
        ref: string;
    };
    chart?: {
        series: ChartSeries[];
    };
    component?: {
        name: string;
        props: any;
        data?: Reference;
        _ref: string;
    };
    text?: {
        content: string;
        markdown: boolean;
    };
    document?: {
        value: any;
    }
}

export class ErrorObject extends Error {
    constructor(public code: StatusCode, public message: string) {
        super();
    }

    public toString = (): string => {
        return `error (${this.code}) ${this.message || ""}`;
    };
}

export class ChartSeries {
    type: string;
    title: string | MultilangText;
    ref: string;
    x: string;
    y: string;
}

export class Access {
    defaultPermission: DefaultPermission;
    items: AccessItem[];
    expose: boolean;
}

export class AccessItem {
    _id: ObjectId;
    user: ObjectId;
    role?: ObjectId;
    permission: AccessPermission;
}

export class Menu {
    _id: ObjectId;
    name: string;
    comment: string;
    items: MenuItem[];
    _: {
        pack: string;
    };
}

export class MenuItem {
    _id: ObjectId;
    title: string;
    ref: string;
    entity: ObjectId;
    hotkey: Keys;
    items: MenuItem[];
}

export class Pair {
    ref: any;
    title: string;
}

export class App {
    _id: ObjectId;
    home: string;
    defaultTemplate: string;
    locales: Locale[];
    style: string;
    defaultLocale: Locale;
    redirect: RedirectType;
    menu: Menu;
    navmenu: Menu;
    title: string;
    gridPageSize: number;
    addressRules: PackageAddressRule[];
    printingAccess: Access;
    userSingleSession: boolean;
    timeZone: TimeZone;
    timeOffset: number;
    https: boolean;
    dependencies: string[];
    favicon: string;
    brandingLogo: string;
    interactive: boolean;
    loginForm: Reference;
    _: {
        pack?: string;
        loginForm?: string;
    }
}

export class SystemConfigPackage {
    name: string;
    enabled: boolean;
}

export class SystemConfig {
    packages: SystemConfigPackage[];
    hosts: {
        _id: ObjectId;
        address: string;
        app: ObjectId;
        _: {
            app: App
        };
    }[];
    amazon: {
        accessKeyId: string;
        secretAccessKey: string;
    };
    google: {
        apiKey: string;
    };
}

export class Enum {
    _id: ObjectId;
    name: string;
    title: string | MultilangText;
    comment: string | MultilangText;
    items: EnumItem[];
    _: {
        pack: string
    };
}

export class EnumItem {
    _id: ObjectId;
    name: string;
    title: string | MultilangText;
    value: number;
    comment: string | MultilangText
    icon;
}

export class MultilangText {
    en: string;
}

export class SmsAccount {
    address: string;
    serviceType: number;
    username: string;
    password: string;
    number: string;
}

export class EmailAccount {
    _id: ObjectId;
    Title: string;
    Email: string;
    IncommingMailServer: string;
    Username: string;
    Password: string;
    SmtpServer: string;
    SmtpServerPort: number;
    SecuredSmtp: boolean;
    Default: boolean;
}

export class PackageConfig {
    _id: ObjectId;
    apps: App[];
    addressRules: PackageAddressRule[];
    _: {
        version: string;
        repository: string;
        mina: {
            dependencies: any;
        }
    };
}

export class PackageAddressRule {
    match: string;
    action: number;
    target: string;
}

export class File {
    _id: ObjectId;
    size: number;
    name: string;
    path: string;
    created: Date;
    _: {
        uri?: string;
        rawData?: Buffer;
    };
}

export class Text {
    name: string;
    text: string | MultilangText;
}

export class TimeZone {
    _id: ObjectId;
    title: string;
    offset: number;
    abbreviation: string;
    daylightSavingTime: boolean;
    utc: string[];
}

export class RefPortion {
    type: RefPortionType;
    value: string;
    pre?: RefPortion;
    entity?: Entity;
    property?: Property;
    itemId?: ObjectId;
}

export class GeoLocation {
    x: number;
    y: number;
    z: number;
}

export class PutOptions {
    portions: RefPortion[];
}

export class PatchOptions {
    portions: RefPortion[];
}

export class DelOptions {
    portions: RefPortion[];
    itemId?: ObjectId;
}

export class GetOptions {
    itemId?: ObjectId;
    query?: any;
    count?: number;
    skip?: number;
    sort?: any;
    last?: boolean;
    rawData?: boolean;
}

export enum StatusCode {
    Ok = 200,
    Accepted = 202,
    ResetContent = 205,

    MovedPermanently = 301,
    MovedTemporarily = 302,

    BadRequest = 400,
    Unauthorized = 401,
    PaymentRequired = 402,
    Forbidden = 403,
    NotFound = 404,
    MethodNotAllowed = 405,
    NotAcceptable = 406,
    RequestTimeout = 408,
    Gone = 410,
    RequestEntityTooLarge = 413,
    RequestedRangeNotSatisfiable = 416,
    ExpectationFailed = 417,
    UnprocessableEntity = 422,
    UpgradeRequired = 426,
    PreconditionRequired = 428,
    TooManyRequests = 429,
    UnavailableForLegalReasons = 451,

    ServerError = 500,
    NotImplemented = 501,
    ServiceUnavailable = 503,
    NetworkAuthenticationRequired = 511,

    UnknownError = 1001,
    ConfigurationProblem = 1002,
}

export class UploadedFile {
    name: string;
    path: string;
    rawData: Buffer;
}

export enum LogType {
    Fatal = 0,
    Error = 3,
    Warning = 4,
    Info = 6,
    Debug = 7,
    Silly = 8
}

export enum LinkType {
    Auto = 0,
    Help = 1
}

export enum PanelType {
    Stack = 1,
    Dock = 2,
    // Grid = 3,
    Wrap = 4,
    Flex = 5,
    Modal = 6,
}

export enum Orientation {
    Horizontal = 1,
    Vertical = 2,
}

export enum ElemType {
    Text = 1,
    Panel = 2,
    Property = 3,
    Object = 4,
    Function = 5,
    Image = 6,
    Map = 7,
    Chart = 8,
    Viewer = 9, // audio, video, pdf, ...
    Component = 10,
    Tree = 11,
    Document = 12,
    View = 13,
}

export enum EntityType {
    Object = 1,
    Function = 2,
    Form = 3,
    File = 4,
}

export enum AccessPermission {
    None = 0,
    View = 1,
    NewItem = 2,
    DeleteItem = 3,
    Edit = 4,
    Full = 8,
}

export enum PropertyViewMode {
    Visible = 0,
    DetailViewVisible = 1,
    Hidden = 2,
}

export enum PropertyEditMode {
    Readonly = 3,
    OnceOnly = 4,
}

export enum Keys {
    left = 37, right = 39, up = 38, down = 40,
    enter = 13, esc = 27, tab = 9, del = 46, backspace = 8,
    shift = 16, ctrl = 17, alt = 18, space = 32,
    f1 = 112, f2 = 113, f3 = 114, f4 = 115, f5 = 116, f6 = 117, f7 = 118, f8 = 119, f9 = 120, f10 = 121, f11 = 122, f12 = 123,
    s = 83, t = 84, u = 85, v = 86, w = 87, x = 88, y = 89, z = 90, m = 77, q = 81,
    num_8 = 104, num_2 = 98
}

export enum Locale {
    en = 1033,
    ar = 1025,
    fa = 1065,
    fr = 1036,
    de = 1031,
    it = 1040,
    ru = 1049,
    sl = 1060,
    tr = 1055,
    pt = 1046,
    zh = 2052,
    es = 3082,
    hi = 1081,
    ja = 1041,
    ko = 1042
}

export enum SourceType {
    Db = 1,
    File = 2,
    Memory = 3,
    Redis = 4,
    Ftp = 5,
    Rest = 6,
    Soap = 7,
    Kafka = 8,
    S3 = 9
}

export enum FunctionMode {
    OpenDialog = 1,
    OpenPage = 2,
    Run = 3,
}

export enum ChangeFrequency {
    always = 1,
    hourly = 2,
    daily = 3,
    weekly = 4,
    monthly = 5,
    yearly = 6,
    never = 7,
}

export enum NewItemMode {
    inline = 0,
    newPage = 1,
    modal = 2
}

export enum PropertyReferType {
    inlineData = 9,
    outbound = 5,
    select = 10,
}

export enum GlobalType {
    unknown = 0,
    number = 1,
    string = 2,
    boolean = 3,
    time = 4,
    location = 5,
    id = 6,
    object = 7,
    file = 8,
}

export enum RefPortionType {
    entity = 1,
    property = 2,
    item = 3,
    file = 4,
}

export enum TimeFormat {
    yearMonthDayHourMinute = 1,
    hourMinute = 2,
    dateWithDayOfWeek = 3,
    friendlyDate = 4,
}

export enum ObjectReferType {
    similar = 0,
    filter = 1,
    aggregate = 2,
    value = 3,
}

export enum RedirectType {
    Permanent
}

export enum SysCollection {
    audits = "audits",
    users = "users",
    dictionary = "dictionary",
    objects = "objects",
    functions = "functions",
    roles = "roles",
    packageConfig = "packageConfig",
    systemConfig = "systemConfig",
    menus = "menus",
    drives = "drives",
    forms = "forms",
    auditTypes = "auditTypes",
    enums = "enums",
}

export enum SysAuditTypes {
    addItem = "5d7b8fbd10f5321b74a1b83b",
    edit = "5d7b91d410f5321b74a1b83c",
    deleteItem = "5d7b91e810f5321b74a1b83d",
    login = "5d7b91f710f5321b74a1b83e",
    logout = "5d7b920410f5321b74a1b83f",
    start = "5d7b920d10f5321b74a1b840",
    stop = "5d7b921b10f5321b74a1b841",
    uncaughtException = "5d7b922910f5321b74a1b842",
    unhandledRejection = "5d7b923510f5321b74a1b843",
    tryNotAllowedModify = "5d7b920d10f5321b74a1b840",
}

export enum SystemProperty {
    title = "title",
    name = "name",
    time = "time",
    comment = "comment",
}

export class EmbeddedInfo {
    txt: string;
    val: any;
    err: string;
}

export enum PType {
    text = "589f2d8bb16c7523543ae1b0",
    number = "589f2d8bb16c7523543ae1b3",
    boolean = "589f2d8bb16c7523543ae1b9",
    time = "589f2d8bb16c7523543ae1b6",
    reference = "589f2d8bb16c7523543ae1cb",
    location = "58a18d9c70c25e0c30930287",
    file = "589f2d8bb16c7523543ae1c2",
    obj = "5e2562d9a3c257129832b75f",
}

export enum GridRowHeaderStyle {
    index = 0,
    empty = 1,
    select = 2,
}

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

export enum PropertyConditionBehavior {
    Visible = 1,
    Enable = 2,
}

export enum DefaultPermission {
    None = 0,
    View = 1,
    Full = 8,
}

export enum EnvMode {
    Development = 'development',
    Production = 'production',
}

export enum RequestMode {
    inline = 1,
    download = 2,
    api = 3,
    inlineDev = 4,
}

export class WebResponse implements IError {
    data: any;
    form: FormDto;
    keywords: string;
    openGraph;
    description: string;
    redirect: string;
    message: string;
    code: StatusCode;
    config: AppStateConfig;
}

export class AppStateConfig {
    host?: string;
    version: string;
    appTitle: string;
    brandingLogo: string;
    locale: string;
    appLocales: Pair[];
    loginRef: string;
    loginTitle: string;
    interactive: boolean;
    menu: MenuItem[];
    navmenu: MenuItem[];

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

export enum WebMethod {
    get = "GET",
    post = "POST",
    put = "PUT",
    patch = "PATCH",
    del = "DELETE"
}

export interface IError {
    code: StatusCode;
    message: string;
}

export class UnitTestObject {
    _id: ObjectId;
    name: string;
    age: number;
    codes: StatusCode[];
    picture?: File[];
    address: {
        detail: {
            "city": string
            "street": string
        },
        location: GeoLocation
    };
    birthday: Date;
}

export enum DriveMode {
    Gallery = 1,
    NonSelectable = 2,
}

export enum DirFileType {
    File = 1,
    Folder = 2,
}

export class DirFile {
    name: string;
    size?: number;
    type: DirFileType;
}

export enum ClientCommand {
    Notification = 1,
    Log = 2,
    Question = 3,
    Answer = 4,
    FunctionDone = 5,
    FunctionFailed = 6,
    Ping = 7,
    PingAck = 8,
    Download = 9
}

export enum ObjectDetailsViewType {
    Grouped = 1,
    Tabular = 2,
    Simple = 3,
    Wizard = 4,
}

export enum ObjectListsViewType {
    Grid = 1,
    Card = 2,
    Column = 3,
}

export enum YesNo {
    Yes = 1,
    No = 2,
}

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
    Default = 0,
    Updated = 1,
    Inserted = 2,
    Deleted = 4,
}

export class EntityMeta {
    marked: boolean;
    state: ItemState;
    dec: FunctionDec | ObjectDec;
}

export class ObjectDec {
    title: string;
    ref: string;
    newItemMode: NewItemMode;
    rowHeaderStyle: GridRowHeaderStyle;
    reorderable: boolean;
    detailsViewType: ObjectDetailsViewType;
    listsViewType: ObjectListsViewType;
    pageLinks: any[];
    properties: Property[];
    pages: number;
    page: number;
    links: EntityLink[];
}

export class FunctionDec {
    _id: Reference;
    name: string;
    title: string;
    interactive: boolean;
    clientSide: boolean;
    properties: Property[];
    links?: EntityLink[];
    test?: {
        samples?: any[];
    }
}

export enum ReqParams {
    query = "q",
    version = "v",
    locale = "e",
    page = "p",
    cache = "c",
    sort = "s",
    mode = "m",
    functionType = "f"
}
