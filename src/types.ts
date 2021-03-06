import {ID} from 'bson-util';
import * as Url from 'url';

export {ID};

export class Context {
    httpReq;
    httpRes;
    req: any;
    res: WebResponse;
    app: App;
    access: AccessAction;
    publish: boolean;
    user: User;
    sessionID: string;
    host: Host;
    origin: Url.URL; // location.href while requesting
    prefix: string;
    locale: Locale;
    // context db which is context host db, but if entity is 'service data' object, db would be the entity db!
    db: string;
    service: ServiceConfig;
    timeOffset: number;
    originalUrl: string;
    url: Url.URL;
    portions: RefPortion[];
    entity: Entity;
    apiVersion: string;
    query: any;
    referer: string;
    mode: RequestMode;
    functionMode: FunctionMode;
    objectViewType: ObjectViewType;
    reqNewItem: boolean;
    reqNewItemDefaults: any;
    page: number;
    pages: number;
    count: number;
    approximateCount: number;
    sort: any;
}

export class AuditArgs {
    detail?: any;
    comment?: string;
    level: LogType;
    type?: ID;
    user?: ID;
    time?: Date;
}

export class Role {
    _id: ID;
    title: string | MultilangText;
    roles: ID[];
    permissions: AccessPermission[];
    comment: string | MultilangText;
    _: {
        db: string;
    };
}

export class AccessPermission {
    _id: ID;
    resourceType: EntityType;
    obj: ID;
    func: ID;
    form: ID;
    drive: ID;
    objAction: PermissionObjectAction;
    funcAction: PermissionFunctionAction;
    formAction: PermissionFormAction;
    driveAction: PermissionDriveAction;
    properties: {
        name: string;
        action: PermissionObjectAction;
    }[];
}

export enum AppTheme {
    dark = 0,
    light = 1,
}

export class User {
    _id: ID;
    roles: ID[] = [];
    disabled = false;
    email: string;
    password: string;
    title: string;
    firstName: string;
    lastName: string;
    country: ID;
    passwordExpireTime: Date;
    passwordResetLinkExpire?: Date;
    image: mFile;
    birthDate: Date;
    mobile: string;
    lastOnline: Date;
    lastOffline: Date;
    time: Date = new Date();
    service: ID;
    theme: AppTheme;
    _: {
        isOnline?: boolean;
        roles?: ID[];
    }
}

export class AuditType {
    _id: ID;
    name: string;
    channel: string;
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

export class ServiceConfig {
    _id: ID;
    title: string | MultilangText;
    version: string;
    packages: string[];
    emailAccounts: EmailAccount[];
    smsAccounts: SmsAccount[];
    emailVerificationTemplate: EmailTemplateConfig;
    welcomeEmailTemplate: EmailTemplateConfig;
    resetPasswordTemplate: EmailTemplateConfig;
    addressRules: PackageAddressRule[];
    apps: ID[];
    dependencies: string[];

    _: {
        apps?: App[];
    }
}

export class Global {
    postClientCommandCallback: (cn: Context, ...args: any[]) => void;
    dbs: { [packAndCs: string]: any } = {}; // any not mongodb.Db because of client side reference
    countries: { [code: string]: Country; } = {};
    clientQuestionCallbacks: { [sessionId: string]: (answer: number | null) => void; } = {};
    entities: Entity[];
    serviceConfigs: { [service: string]: ServiceConfig; };
    services: string[];
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
    expose: boolean;
    icon: string;
    comment: string | MultilangText;
    entityType: EntityType;
    links: EntityLink[];
    guestAccess: AccessAction;
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
    sourceClass: ObjectSourceClass;
    approximateCount: number;
    modified: ID;
    initializing: ID;
    detailsViewType: ObjectDetailsViewType;
    listsViewType: ObjectListsViewType;
    _: {
        db: string;
        permissions?: Access[];
        autoSetInsertTime?: boolean;
        inited?: boolean;
        filterObject?: mObject;
    }
}

export class Function extends Entity implements IProperties {
    properties: Property[];
    mode: FunctionMode;
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
    db: string;
    permissions?: Access[];
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
    validation: string;
    validationError: string;
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
        permissions?: Access[];
        ref?: string;
        items?: Pair[];
        parentPropertiesCompared?: boolean;
        sorted?: boolean;
        sequence?: number;
    };
}

export class Drive extends Entity {
    type: SourceType;
    sourceClass: DriveSourceClass;
    address: string;
    _: {
        db: string;
        uri?: string;
        permissions?: Access[];
    }
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
    user: ID;
    role: ID;
    permission: AccessAction;
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
    _z: number;
    _id: ID;
    home: string;
    prefix: string;
    template: string;
    style: string;
    locales: Locale[];
    defaultLocale: Locale;
    redirect: RedirectType;
    menu: ID;
    headerMenu: boolean;
    title: string | MultilangText;
    comment: string | MultilangText;
    gridPageSize: number;
    addressRules: PackageAddressRule[];
    userSingleSession: boolean;
    timeZone: TimeZone;
    timeOffset: number;
    https: boolean;
    favicon: string;
    brandingLogo: string;
    interactive: boolean;
    iconStyle: string;
    navColor: string;
    iconColor: string;
    _: {
        db?: string;
        menu?: Menu;
        templateRender?: any;
    }
}

export class Host {
    _id: ID;
    address: string;
    defaultApp: ID;
    aliases: string[];
    service: ID;
    _: {
        defaultApp?: App;
        service: ServiceConfig;
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
    UserNotFound = 1003,
}

export class UploadedFile {
    name: string;
    path: string;
    rawData: any;
}

export enum LogType {
    Fatal = 0,
    Error = 3,
    Warn = 4,
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
    // Map = 7,
    Chart = 8,
    // Viewer = 9, // audio, video, pdf, ...
    Component = 10,
    // Tree = 11,
    Document = 12,
    // View = 13,
}

export enum EntityType {
    Object = 1,
    Function = 2,
    Form = 3,
    Drive = 4,
}

export enum AccessAction {
    None = 0,
    View = 1,
    Edit = 2,
    NewItem = 4,
    DeleteItem = 8,
    Execute = 16,
    Export = 32,
    Import = 64,
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

export const ObjectIDs = {
    users: "54985ac730c392589b16d3c3",
    roles: "54985d4830c392589b16d3c5",
    objects: "54a3c8d630c3a4889881b336",
    apps: "5f36756d4547dff5188a5ebb",
    dictionary: "549fcd25d3ca1b10fc490fcc",
    functions: "54a51cefd3ca1b12e0e9374d",
    hosts: "5e9b159b3ec11637ec8c3b02",
    menus: "58e61fb7f2ace02e40cf2c94",
    drives: "5e32f5a10207102778ce1f96",
    forms: "54993f3430c33d6e6e9dd0d4",
    enums: "5daa0b11e1635a1e6862baac",
    clientConfig: "5e3c2de67447070638c9c0c1",
}

export class Service {
    _id: ID;
    name: string;
    enabled: boolean;
    comment: string | MultilangText;
}

export enum Objects {
    audits = "audits",
    users = "users",
    dictionary = "dictionary",
    nodeConfig = "nodeConfig",
    auditTypes = "auditTypes",
    countries = "countries",
    documents = "documents",
    feedbacks = "feedbacks",
    documentDirectories = "documentDirectories",
    objects = "objects",
    services = "services",
    nodes = "nodes",
    serviceConfig = "serviceConfig",
    functions = "functions",
    roles = "roles",
    apps = "apps",
    hosts = "hosts",
    menus = "menus",
    collections = "collections",
    migrations = "migrations",
    drives = "drives",
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

export const SysAuditTypes = {
    addItem: new ID("5d7b8fbd10f5321b74a1b83b"),
    edit: new ID("5d7b91d410f5321b74a1b83c"),
    deleteItem: new ID("5d7b91e810f5321b74a1b83d"),
    login: new ID("5d7b91f710f5321b74a1b83e"),
    logout: new ID("5d7b920410f5321b74a1b83f"),
    start: new ID("5d7b920d10f5321b74a1b840"),
    stop: new ID("5d7b921b10f5321b74a1b841"),
    uncaughtException: new ID("5d7b922910f5321b74a1b842"),
    unhandledRejection: new ID("5d7b923510f5321b74a1b843"),
    tryNotAllowedModify: new ID("5d7b920d10f5321b74a1b844"),
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
    referenceValuesLoadCount: 15,
    objectIdRegex: /^(?=[a-f\d]{24}$)(\d+[a-f]|[a-f]+\d)/i,
    defaultSignInUri: '/signin',
    sysDb: "sys",
    MinaVersion: 5,
    titlePropertyName: "title",
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
    PUBLIC_BUCKET_NAME: "mina-public",
    PUBLIC_BUCKET_URI: "https://mina-public.s3.eu-central-1.amazonaws.com",
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
        signinTitle: string;
        authenticated: boolean;
        photoUrl?: string;
        theme: string;
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
    Bars = 4,
}

export enum YesNo {
    Yes = 1,
    No = 2,
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
    access: AccessAction;
    count: number;
    pages: number;
    page: number;
    links: EntityLink[];
}

export class FunctionDec {
    _id: ID;
    name: string;
    title: string;
    mode: FunctionMode;
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
    token = "k",
    functionMode = "f",
    newItem = "n",
    newItemDefaults = "d",
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
    _id: ID;
    email: string;
    title: string;
    firstName: string;
    country: ID;
    lastName: string;
    image: mFile;
    birthDate: Date;
    mobile: string;
    lastOnline: Date;
    time: Date = new Date();
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

export enum PermissionObjectAction {
    View = 1,
    Edit = 2,
    Add = 4,
    Delete = 8,
    Full = 255,
}

export enum PermissionFunctionAction {
    Execute = 16,
}

export enum PermissionFormAction {
    View = 1,
}

export enum PermissionDriveAction {
    View = 1,
    Edit = 2,
    Add = 4,
    Delete = 8,
    Full = 255,
}

export enum ObjectSourceClass {
    Default = 0,
    Internal = 2,
    Node = 3,
}

export class NodeConfig {
    inviteEmailTemplate: EmailTemplateConfig;
}

export enum DriveSourceClass {
    Public = 1,
    Node = 0,
}

export class Node {
    _id: ID;
    name: string;
    connectionString: string;
    aws: {
        application: string;
        environment: string;
        s3Bucket: string;
        driveS3Bucket: string;
    }
}