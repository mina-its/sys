import {ID} from 'bson-util';

export {ID};

export interface Context {
    locale: Locale;
    user?: User;
    sessionID?: string;
    db?: string;
    req?: any;
    res?: {
        redirect?: string;
    };
    url?: URL;
}

export class AuditArgs {
    detail?: any;
    comment?: string;
    level: LogType;
    pack?: string;
    type?: ID;
    user?: ID;
    time?: Date;
}

export class Role {
    _id: ID;
    title: string | MultilangText;
    // name: string;
    roles: ID[];
    comment: string | MultilangText;
    _: {
        db: string;
    };
}

export class User {
    _id: ID;
    roles: ID[] = [];
    disabled = false;
    email: string;
    password: string;
    title: string;
    firstName: string;
    country: ID;
    lastName: string;
    passwordExpireTime: Date;
    passwordResetLinkExpire?: Date;
    image: mFile;
    birthDate: Date;
    mobile: string;
    lastOnline: Date;
    lastOffline: Date;
    time: Date;
    _: {
        pack?: string;
        isOnline?: boolean;
        roles?: ID[];
    }
}

export class AuditType {
    _id: ID;
    name: string;
    title: string | MultilangText;
    disabled: boolean
}

export enum SmsProvider {
    Infobip = "infobip",
}

export class Country {
    name: string;
    code: string;
    prefix: string;
    population: number;
    area: number;
    gdp: string;
    group: string;
    locale: Locale;
    localName: string;
}

export enum TextEditor {
    Html = 1,
    Javascript = 2,
    Css = 3,
    Markdown = 4,
    Xml = 5,
    Json = 6,
    HtmlText = 7,
}

export class Global {
    postClientCommandCallback: (cn: Context, ...args: any[]) => void;
    dbs: { [packAndCs: string]: any } = {}; // any not mongodb.Db because of client side reference
    systemConfig: SystemConfig;
    countries: { [code: string]: Country; } = {};
    packageInfo: { [pack: string]: PackageInfo; } = {};
    appConfig: { [db: string]: AppConfig; } = {};
    clientQuestionCallbacks: { [sessionId: string]: (answer: number | null) => void; } = {};
    rootDir: string;
    entities: Entity[];
    drives: Drive[];
    suspendService: boolean = false;
    auditTypes: AuditType[];
    timeZones: TimeZone[];
    dictionary: { [id: string]: string | MultilangText };
    menus: Menu[];
    apps: App[];
    hosts: Host[];
    enums: Enum[];
    enumTexts: { [id: string]: any; };
    systemProperties: Property[];
    roles: Role[];
}

export class Entity {
    _id: ID;
    title: string | MultilangText;
    name: string;
    comment: string | MultilangText;
    entityType: EntityType;
    access: Access;
    links: EntityLink[];
    _: IEntity;
}

export class mObject extends Entity implements IProperties {
    properties: Property[];
    auditModify: boolean;
    isList: boolean;
    newItemMode: NewItemMode;
    reference: ID;
    titleProperty: string;
    sortDefaultProperty: string;
    query: any;
    referType: ReferType;
    filterObject: ID;
    source: SourceType;
    rowHeaderStyle: GridRowHeaderStyle;
    reorderable: boolean;
    approximateCount: number;
    modified: ID;
    detailsViewType: ObjectDetailsViewType;
    listsViewType: ObjectListsViewType;
    _: {
        access?: { [db: string]: Access; };
        db: string;
        autoSetInsertTime?: boolean;
        inited?: boolean;
        filterObject?: mObject;
    }
}

export class Function extends Entity implements IProperties {
    properties: Property[];
    mode: FunctionMode;
    pack: string;
    clientSide: boolean;
    returnType: ID;
    interactive: boolean;
    test: {
        mock: boolean;
        samples?: FunctionTestSample[];
    };
    _: IEntity
}

export class Form extends Entity {
    template: string;
    keywords: string[];
    changeFrequency: ChangeFrequency;
    breadcrumb: Pair[];
    publish: boolean;
    cached: string;
    locale: Locale;
    openGraph;
    elems: Elem[] = [];
    _: IEntity;

    constructor(pack) {
        super();
        this._ = {db: pack};
    }
}

export class FormDto {
    title: string;
    breadcrumb: Pair[] = [];
    breadcrumbLast: string;
    elems: Elem[] = [];
    declarations?: { [ref: string]: ObjectDec | FunctionDec; } = {};
}

export class ObjectModifyState {
    type: ObjectModifyType;
    itemId?: ID;
    item?: any;
    items?: any;
}

export class EmailTemplateConfig {
    from: string;
    title: string | MultilangText;
    subject: string | MultilangText;
    content: string | MultilangText;
}

export class SendEmailParams {
    fromName?: string;
    isHtml?: boolean;
    attachments?: mFile[];
}

export class SendSmsParams {
    delivery: boolean;
}

export enum ObjectModifyType {
    Update = 1,
    Insert = 2,
    Patch = 3,
    Delete = 4,
}

export interface IEntity {
    access?: { [pack: string]: Access; };
    db: string;
}

export interface IProperties {
    name: string;
    properties: Property[];
}

export interface IData {
    _id: ID;
    _z: number;
    _: EntityMeta;
}

export class Property implements IProperties {
    _id;
    name: string;
    title;
    group;
    titleProperty: string;
    properties: Property[];
    comment: string;
    viewMode: PropertyViewMode;
    defaultValue: string;
    editMode: PropertyEditMode;
    commentStyle: string;
    filter: string;
    required: boolean;
    type: ID;
    access: Access;
    foreignProperty: string;
    isList: boolean;
    english: boolean;
    useAsObject: boolean;
    links: EntityLink[];
    formula: string;
    detailsViewType: ObjectDetailsViewType;
    listsViewType: ObjectListsViewType;
    referType: PropertyReferType;
    description: string;
    dependsOn: string;
    condition: string;
    conditionBehavior: PropertyConditionBehavior;
    reorderable: boolean;
    text: {
        markdown: boolean;
        multiLine: boolean;
        editor: TextEditor;
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
        drive: ID;
        preview: boolean;
        sizeLimit: number;
        gallery: boolean;
        path: string;
    };
    time: {
        format: TimeFormat;
        customFormat: string;
        iSODate: boolean;
    };
    number: {
        // longInteger: boolean;
        float: boolean;
        digitGrouping: boolean;
        autoIncrement: boolean;
        seed: number;
    };
    reference: {
        // goToReferenceOption: boolean;
        // radioList: boolean;
        // buttonGroupList: boolean;
    };
    documentView: boolean;
    _z: number;

    _: {
        gtype?: GlobalType;
        fileUri?: string;
        isRef?: boolean;
        enum?: Enum;
        ref?: string;
        items?: Pair[];
        parentPropertiesCompared?: boolean;
        sorted?: boolean;
        sequence?: number;
    };
}

export class Drive {
    _id: ID;
    title: string;
    type: SourceType;
    comment: string | MultilangText;
    address: string;
    access: Access;
    _: {
        db: string;
        uri?: string;
    }
}

export class DriveConfig {
    _id: ID;
    uri: string;
    drive: ID;
    s3: {
        region: string;
        accessKeyId: string;
        secretAccessKey: string;
        _sdk: any;
    };
}

export class FunctionTestSample {
    _id: ID;
    title: string;
    input?: any;
    result?: any;
    message?: string;
    code?: StatusCode;
    time?: Date;
}

export class EntityLink {
    _id: ID;
    address: string;
    title: string | MultilangText;
    comment: string | MultilangText;
    condition: string;
    disable: boolean;
    type: LinkType;
    access: Access;
    style: string;
}

export enum ObjectViewType {
    GridView = 1,
    DetailsView = 2,
    TreeView = 3,
    Filter = 4,
}

export class Elem {
    _id: ID;
    id: string;
    type: ElemType;
    toolbar?: boolean;
    comment?: string;
    styles?: string;
    title?: string;

    _: {
        ref: string;
    };

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
        data?: ID;
        toolbar?: boolean;
        _?: {
            ref?: string;
            data?: any; // For future, Not used yet
        }
        props?: {
            name: string;
            entityRef: string;
        }[];
    };
    func?: {
        ref: any;
        clientSide: boolean;
        showParams: boolean;
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
        data?: ID;
        _: {
            ref: string;
            data: any;
        }
    };
    text?: {
        content: string;
        markdown?: boolean;
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
    defaultPermission?: AccessPermission;
    items?: AccessItem[];
    expose?: boolean;
}

export class AccessItem {
    _id: ID;
    user: ID;
    role?: ID;
    permission: AccessPermission;
}

export class Menu {
    _id: ID;
    name: string;
    comment: string;
    items: MenuItem[];
    _: {
        db: string;
    };
}

export class MenuItem {
    _id: ID;
    title: string;
    ref: string;
    entity: ID;
    hotkey: Keys;
    _cs?: string;
    items: MenuItem[];
}

export class Pair {
    ref: any;
    title: string;
    _cs?: string;
}

export class TreePair {
    ref: any;
    title: string;
    items?: TreePair[];
    _cs?: string;
}

export class App {
    _id: ID;
    home: string;
    template: string;
    style: string;
    locales: Locale[];
    defaultLocale: Locale;
    redirect: RedirectType;
    menu: ID;
    headerMenu: boolean;
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
    signInUri: string;
    iconStyle: string;
    navColor: string;
    iconColor: string;
    _: {
        db?: string;
        menu?: Menu;
        templateRender?: any;
    }
}

export class SystemConfigStaticPackage {
    _id: ID;
    name: string;
    address: string;
}

export class Host {
    _id: ID;
    address: string;
    aliases: string[];
    prefixes: {
        prefix: string;
        app: ID;
        drive: ID;
        _: {
            app?: App;
            drive?: Drive;
        }
    }[];
    _: {
        db: string;
    }
}

export class Enum {
    _id: ID;
    name: string;
    title: string | MultilangText;
    comment: string | MultilangText;
    items: EnumItem[];
    _: {
        db: string
    };
}

export class EnumItem {
    _id: ID;
    name: string;
    title: string | MultilangText;
    value: number;
    comment: string | MultilangText;
    style: string;
}

export class MultilangText {
    en: string;
}

export class SmsAccount {
    number: string;
    username: string;
    password: string;
    uri: string;
    provider: string;
    enabled: boolean;
}

export class EmailAccount {
    _id: ID;
    email: string;
    username: string;
    password: string;
    smtpServer: string;
    smtpPort: number;
    secure: boolean;
    enabled: boolean;
}

export class AppConfig {
    _id: ID;
    defaultPack: string;
    apps: App[];
    emailAccounts: EmailAccount[];
    smsAccounts: SmsAccount[];
    emailVerificationTemplate: EmailTemplateConfig;
    welcomeEmailTemplate: EmailTemplateConfig;
    resetPasswordTemplate: EmailTemplateConfig;
    addressRules: PackageAddressRule[];
}

export class SystemConfig {
    dbs: {
        name: string;
        enabled: boolean;
    }[];
    packages: {
        name: string;
        enabled: boolean;
    }[];
    drives: DriveConfig[];
    sessionsPath: string;
    google: {
        signin: {
            clientId: string;
            clientSecret: string;
            callbackUrl: string;
        }
    }
}

export class PackageInfo {
    version: string;
    repository: string;
    mina: {
        dependencies: [(pack: string) => string];
        packageType: PackageType;
        version: string;
    }
}

export enum PackageType {
    StaticWebsite = "static-website",
    Code = "code"
}

export class PackageAddressRule {
    match: string;
    action: number;
    target: string;
}

export class mFile {
    size: number;
    name: string; // must be unique
    type?: string;
    path?: string;
    lastModified?: number;
    _?: {
        uri?: string;
        rawData?: any;
        dimensions?: string;
    };
}

export class Text {
    name: string;
    text: string | MultilangText;
}

export class TimeZone {
    _id: ID;
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
    itemId?: ID;
}

export class GeoLocation {
    x: number;
    y: number;
    z: number;
}

export class Point {
    x: number;
    y: number;
}

export class PutOptions {
    filter?: any;
    portions?: RefPortion[];
}

export class PatchOptions {
    portions: RefPortion[];
}

export class DelOptions {
    portions?: RefPortion[];
    itemId?: ID;
    query?: any;
}

export class GetOptions {
    itemId?: ID;
    query?: any;
    count?: number;
    skip?: number;
    sort?: any;
    last?: boolean;
    linkIDs?: boolean;
    lazyLink?: boolean;
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
    rawData: any;
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
    PropertyGroupLink = 2,
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
    Edit = 2,
    NewItem = 4,
    DeleteItem = 8,
    Execute = 16,
    Full = 255,
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
    enter = 13, esc = 27, tab = 9, del = 46, ins = 45, backspace = 8,
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
    ResultAsObject = 4,
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
    select = 10,
    InnerSelectType = 4,
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
    YearMonthDayHourMinute = 1,
    HourMinute = 2,
    DateWithDayOfWeek = 3,
    FriendlyDate = 4,
    YearMonthDay = 5,
    DayMonthNameYear = 6,
}

export enum ReferType {
    Filter = 1,
    Similar = 2,
    SimilarJustProps = 3,
    Aggregate = 4,
}

export enum RedirectType {
    Permanent
}

export enum FileType {
    Excel = 1,
    Csv = 2,
    Pdf = 3,
}

export enum Objects {
    audits = "audits",
    users = "users",
    projects = "projects",
    userCustomizations = "userCustomizations",
    tasks = "tasks",
    devConfig = "devConfig",
    dictionary = "dictionary",
    auditTypes = "auditTypes",
    countries = "countries",
    documents = "documents",
    feedbacks = "feedbacks",
    documentDirectories = "documentDirectories",
    objects = "objects",
    functions = "functions",
    roles = "roles",
    appConfig = "appConfig",
    systemConfig = "systemConfig",
    hosts = "hosts",
    menus = "menus",
    drives = "drives",
    flowcharts = "flowcharts",
    flowchartsDeclarations = "flowchartsDeclarations",
    notes = "notes",
    forms = "forms",
    enums = "enums",
}

export enum DocStatus {
    Ready = 1,
    Draft = 2,
    UnderReview = 3,
    NeedsRevision = 4,
}

export class DocumentDirectoryItem {
    doc: Document;
    children: DocumentDirectoryItem [];
}

export class DocumentDirectory {
    _id: ID;
    title: string | MultilangText;
    comment: string | MultilangText;
    docs: DocumentDirectoryItem [];
}

export class Document {
    _id: ID;
    title: string | MultilangText;
    name: string;
    content: string | MultilangText;
    directory: ID;
    author: ID;
    time: Date;
    status: DocStatus;
    keywords: string[];
    publish: boolean;
    lastModified: Date;
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

export enum PType {
    text = "589f2d8bb16c7523543ae1b0",
    number = "589f2d8bb16c7523543ae1b3",
    boolean = "589f2d8bb16c7523543ae1b9",
    time = "589f2d8bb16c7523543ae1b6",
    id = "589f2d8bb16c7523543ae1cb",
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
    referenceValuesLoadCount: 10,
    sysDb: "sys",
    titlePropertyName: "title",
    defaultAddress: "_default",
    indexProperty: "_z",
    amazonS3ApiVersion: "2006-03-01",
    ClassStyle_Object: "cs-obj",
    ClassStyle_Function: "cs-func",
    ClassStyle_Form: "cs-form",
    InfoLogFile: 'info.log',
    ErrorLogFile: 'error.log',
    mongodbPoolSize: 10,
    mainDbSourceName: "db",
    systemPropertiesObjectName: "systemProperties",
    timeZonesCollection: "timeZones",
    DEFAULT_APP_TEMPLATE: `<!DOCTYPE html><html><head><%- head_main %></head><body><div id='app'></div><%- main_state() %></body><script>window['start']();</script></html>`,
    PASSWORD_EXPIRE_AGE: 180, // days
};

export enum PropertyConditionBehavior {
    Visible = 1,
    Enable = 2,
}

export enum EnvMode {
    Development = 'development',
    Production = 'production',
}

export enum RequestMode {
    Direct = 0,
    inline = 1,
    download = 2,
    api = 3,
    inlineDev = 4,
}

export class WebResponse implements IError {
    data: any;
    form: FormDto;
    keywords: string[];
    description: string;
    redirect: string;
    message: string;
    code: StatusCode;
    modifyResult: any;
    config: AppStateConfig;
    texts: { [key: string]: string };
}

export class AppStateConfig {
    host?: string;
    prefix?: string;
    version: string = "";
    appTitle: string = "";
    brandingLogo: string = "";
    apps: {
        iconStyle: string;
        navColor: string;
        iconColor: string;
        title: string;
        prefix: string;
    }[];
    locale: string = null;
    localeTitle: string = null;
    defaultLocale?: string = null;
    rtl: boolean = false;
    appLocales: Pair[] = [];
    user: {
        loginTitle?: string;
        loginUrl?: string;
        photoUrl?: string;
        title?: string;
        email?: string;
        accountUrl?: string;
    };
    interactive: boolean = false;
    menu: MenuItem[] = [];
    headerMenu: boolean = false;
    style: string;
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
    _id: ID;
    name: string;
    age: number;
    codes: StatusCode[];
    picture?: mFile[];
    address: {
        detail: {
            "city": string
            "street": string
        },
        location: GeoLocation
    };
    birthday: Date;
}

export enum DirFileType {
    File = 1,
    Folder = 2,
    Drive = 3,
}

export class Note {
    _id: ID;
    url: string;
    content: string;
    time: Date;
    author: ID;
    access: Access;
}

export class DirFile {
    _id: ID;
    name: string;
    size?: number;
    lastModified?: number;
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
    Tree = 5,
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
    showProgress?: boolean = false;
}

export class NotificationInfo {
    message: string;
    type: LogType;
}

export class EntityMeta {
    marked?: boolean;
    dec: FunctionDec | ObjectDec;
    ref?: string;
    msg?: any;
}

export class ObjectDec {
    title: string;
    comment: string;
    ref: string;
    newItemMode: NewItemMode;
    newItemDefaults: any;
    rowHeaderStyle: GridRowHeaderStyle;
    reorderable: boolean;
    detailsViewType: ObjectDetailsViewType;
    listsViewType: ObjectListsViewType;
    pageLinks: any[];
    properties: Property[];
    filterDec: {
        properties: Property[];
    };
    filterData: any;
    access: AccessPermission;
    count: number;
    pages: number;
    page: number;
    links: EntityLink[];
}

export class FunctionDec {
    _id: ID;
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

export class ApiDocParameter {
    title?: string;
    name: string;
    type: string;
    required?: boolean;
    value: string;
    comment?: string;
}

export class ApiDocOperation {
    method: WebMethod;
    uri: string;
    comment: string;
    params: ApiDocParameter[];
}

export class ApiDocBlock {
    title: string;
    name: string;
    operations: ApiDocOperation[] = [];
}

export class ApiDocProprty {
    name: string;
    type: string;
    required: boolean;
    description: string;
    sample: any;
    properties?: Array<ApiDocProprty>;
}

export class ApiDocSchema {
    name: string;
    properties: Array<ApiDocProprty>;
}

export class ApiDocEnum {
    title: string;
    name: string;
    items: Array<{
        name: string;
        value: number;
    }>;
}

export class ApiDoc {
    version: string;
    uriPrefix: string;
    blocks: ApiDocBlock[] = [];
    schemas: ApiDocSchema[] = [];
    enums: ApiDocEnum[] = [];
}

export class SysDashboardInfo {
    objectsCount: number;
    functionsCount: number;
    usersCount: number;
    cpuUsage: number;
}

export class UserProfile {
    email: string;
}

export enum TaskStatus {
    Todo = 1,
    Doing = 2,
    Done = 3,
    OnHold = 4,
    Verify = 5,
}

export enum TaskPriority {
    Urgent = 1,
    High = 2,
    Normal = 3,
    Low = 4,
}

export enum TaskLogType {
    Edit = 1,
}

export enum TaskReminder {
    m0 = 1,
    m5 = 2,
    m15 = 3,
    h1 = 4,
    h2 = 5,
    d0 = 6,
    d1 = 7,
    d2 = 8,
}

export class TaskDueDate {
    _id: ID;
    time: Date;
    setTime?: boolean;
    reminder?: TaskReminder;
}

export class Task {
    _id: ID;
    no: number;
    title: string;
    dueDates: TaskDueDate[];
    description: string;
    assignee: ID;
    project: ID;
    milestone: ID;
    time: Date;
    status: TaskStatus;
    parent: ID;
    priority: TaskPriority;
    favorite: boolean;
    collapse: boolean;
    categories: string[];
    archive: boolean;
    comments: {
        _id: ID;
        time: Date;
        user: ID;
        content: string;
        attachments?: mFile[];
    }[];
    logs: {
        time: Date;
        user: ID;
        type: TaskLogType;
    }[];
    owner: ID;
    _z: number;
    _: {
        multiPlace?: boolean;
        dirty?: boolean;
        dragging?: boolean;
        color?: string;
        bgColor?: string;
        parent?: Task;
    }
}

export class Project {
    _id: ID;
    title: string;
    comment?: string;
    createDate?: Date;
    team?: {
        user: ID,
        editAccess: boolean;
    }[];
    categories: string[];
    milestones: {
        _id: ID,
        title: string,
        dueDate: Date,
        objectives: string;
    }[];
}

export enum TaskView {
    Start = 1,
    Status = 2,
    DueDate = 3,
    Assignee = 4,
    Priority = 5,
    Project = 6,
    Category = 8,
    MileStone = 9,
    Grid = 10,
}

export enum TaskInboxGroup {
    Brainstorm = 1,
    Todo = 2,
    Doing = 3,
    Urgent = 4,
    Overdue = 5,
    Favorite = 6,
}

export class UserCustomization {
    _id: ID;
    user: ID;
    time: Date;
    projectViews: ProjectView[];
}

export class ProjectView {
    _id: ID;
    title: string;
    concern: TaskView = TaskView.Start;
    project: ID = null;
    primary: boolean;
    coloring: TaskView = null;
    calendarOffset: number = 0;
    filter: {
        statuses?: number[];
        priorities?: number[];
        assignees?: ID[];
        projects?: ID[];
        milestones?: ID[];
        categories?: string[];
    } = {
        statuses: null
    }
}

export class GetTaskDto {
    tasks: Task[];
    views: ProjectView[];
    favorites: ID[];
    tasksDec: ObjectDec;
    dueDatesDec: ObjectDec;
    projects: Project[];
    users: Pair[];
    currentUser: ID;
}

export class Feedback {
    _id: ID;
    clientIp: string;
    agent: string;
    locale: Locale;
    country: string;
    url: string;
    time: Date;
    tag: string;
    path: string;
    comment: string;
    value: string;
    user: ID;
}

export class FlowchartNodeLink {
    type: string;
    value: string;
    node: number;
}

export class FlowchartNode {
    title: string | MultilangText;
    tag: number;
    point: Point;
    width: number;
    height: number;
    type: string;
    params: any;
    nexts: FlowchartNodeLink[];
    _: {
        dec: FlowchartNodeDeclare;
    }
}

export class FlowchartNodeDeclare {
    title: string | MultilangText;
    comment: string | MultilangText;
    name: string;
    params: Property[];
    icon: string;
    nexts: {
        title: string | MultilangText;
        name: string;
        parametric: boolean;
    }[];
    defaultResultType: ID;
    nodeStyle: string;
    nodeColor: string;
}

export class FlowchartDeclaration {
    title?: string | MultilangText;
    comment?: string | MultilangText;
    nodes: FlowchartNodeDeclare[];
}

export class Flowchart {
    _id: ID;
    title: string | MultilangText;
    comment: string | MultilangText;
    type: ID;
    nodes: FlowchartNode[];
    _: {
        type: FlowchartDeclaration;
    }
}

