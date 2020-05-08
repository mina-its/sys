let index = {
    "Start                                              ": reload,
    "Load Packages package.json file                    ": loadPackagesInfo,
};


import logger = require('winston');
import https = require('https');
import mongodb = require('mongodb');
import _ = require('lodash');
import archiver = require('archiver');
import xmlBuilder = require('xmlbuilder');
import fs = require('fs-extra');
import path = require('path');
import moment = require('moment');
import graphlib = require('graphlib');
import marked = require('marked');
import Jalali = require('jalali-moment');
import sourceMapSupport = require('source-map-support');
import ejs = require('ejs');
import AWS = require('aws-sdk');
import rimraf = require("rimraf");
import {promises as fsAsync} from "fs";
import {MongoClient, ObjectId} from 'mongodb';
import {fromCallback} from 'universalify';
import {
    App,
    AppConfig,
    AuditArgs,
    ClientCommand,
    Constants,
    Context,
    DelOptions,
    DirFile,
    DirFileType,
    Drive,
    Entity,
    EntityType,
    Enum,
    EnvMode,
    ErrorObject,
    Form,
    Function,
    FunctionTestSample,
    GetOptions,
    Global,
    GlobalType,
    Host,
    ID,
    Locale,
    LogType,
    Menu,
    mFile,
    mObject,
    ObjectModifyState,
    ObjectModifyType,
    PackageInfo,
    Pair,
    Property,
    PropertyReferType,
    PropertyViewMode,
    PType,
    PutOptions,
    RefPortion,
    RefPortionType,
    RequestMode,
    Role,
    SendEmailParams,
    SendSmsParams,
    SmsProvider,
    SourceType,
    StatusCode,
    SysAuditTypes,
    SysCollection,
    SystemProperty,
    Text,
    UploadedFile,
    User,
} from './types';

const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const assert = require('assert').strict;
const {EJSON} = require('bson');
const {exec} = require("child_process");
export let glob = new Global();
const fsPromises = fs.promises;

async function initHosts() {
    for (const host of glob.hosts) {
        if (host.drive) {
            let drive = glob.drives.find(d => d._id.equals(host.drive));
            if (drive) {
                drive._.uri = host.address;
                host._.drive = drive;
            } else
                error(`drive for host '${host.address}' not found!`);
        } else if (host.app) {
            let app = glob.apps.find(d => d._id.equals(host.app));
            if (app) {
                host._.app = app;
            } else
                error(`app for host '${host.address}' not found!`);
        }
    }
}

export async function reload(cn?: Context) {
    let startTime = moment();
    log(`reload ...`);

    await loadSystemConfig();
    await loadPackagesInfo();
    await applyAmazonConfig();
    await loadSystemCollections();
    await loadTimeZones();
    await loadAuditTypes();
    await initializeEnums();
    await initializePackages();
    await initHosts();
    await initializeRoles();
    await initializeEntities();

    let period = moment().diff(startTime, 'ms', true);
    info(`reload done in '${period}' ms.`);
}

export async function start() {
    try {
        process.on('uncaughtException', async err =>
            await audit({db: Constants.sysDb} as Context, SysAuditTypes.uncaughtException, {
                level: LogType.Fatal,
                comment: err.message + ". " + err.stack
            })
        );

        process.on('unhandledRejection', async (err: any) => {
            await audit({db: Constants.sysDb} as Context, SysAuditTypes.unhandledRejection, {
                level: LogType.Fatal,
                comment: typeof err == "number" ? err.toString() : err.message + ". " + err.stack
            });
        });

        sourceMapSupport.install({handleUncaughtExceptions: true});

        configureLogger(false);
        await reload();
        return glob;
    } catch (ex) {
        error("sys.main error:", ex.stack || ex.message || ex);
        return null;
    }
}

export function markDown(text: string) {
    return marked(text);
}

function isWindows() {
    return /^win/.test(process.platform);
}

export function newID(id?: string): ID {
    return new ObjectId(id) as any;
}

export async function audit(cn: Context, auditType: string, args: AuditArgs) {
    try {
        args.type = args.type || newID(auditType);
        args.time = new Date();
        let comment = args.comment || "";
        let type = glob.auditTypes.find(type => type._id.equals(args.type));
        let msg = "audit(" + (type ? type.name : args.type) + "): " + comment;

        switch (args.level) {
            case LogType.Fatal:
                fatal(msg);
                break;
            case LogType.Error:
                error(msg);
                break;
            case LogType.Info:
                info(msg);
                break;
            case LogType.Warning:
                warn(msg);
                break;
        }

        if (type && type.disabled) return;
        await put(cn, SysCollection.audits, args);
    } catch (e) {
        error(`Audit '${auditType}' error: ${e.stack}`);
    }
}

export function run(cn, func: string, ...args) {
    try {
        let theFunction = eval(_.camelCase(func));
        theFunction(cn, ...args);
    } catch (err) {
        warn(`[exe] ${func}`);
    }
}

export async function getByID(cn: Context, objectName: string, id: ID) {
    return get(cn, objectName, {itemId: id});
}

export async function get(cn: Context, objectName: string, options?: GetOptions) {
    let collection = await getCollection(cn, objectName);
    options = options || {} as GetOptions;

    let result;
    if (options.itemId)
        result = await collection.findOne(options.itemId);
    else {
        let find = collection.find(options.query);
        if (options.sort) find = find.sort(options.sort);
        if (options.last) find = find.sort({$natural: -1});
        if (options.count) find = find.limit(options.count);
        if (options.skip) find = await find.skip(options.skip);
        result = await find.toArray();
        if (options.count === 1 && result)
            result = result[0];
    }

    if (!options || !options.linkIDs)
        return result;

    let obj = findObject(cn, objectName);
    if (!obj)
        throw `object '${cn}.${objectName}' not found!`;

    if (!obj.isList && Array.isArray(result))
        result = result[0];

    await makeObjectReady(cn, obj.properties, result, options);
    return result;
}

export async function makeObjectReady(cn: Context, properties: Property[], data: any, options: GetOptions = null) {
    if (!data) return;

    data = Array.isArray(data) ? data : [data];
    for (const item of data) {
        for (const prop of properties) {
            let val = item[prop.name];
            if (!val || !prop._) continue;

            if (prop._.isRef && !prop._.enum && prop.viewMode != PropertyViewMode.Hidden && isID(val)) {
                let refObj = findEntity(prop.type);
                if (!refObj)
                    throwError(StatusCode.UnprocessableEntity, `referred object for property '${cn.db}.${prop.name}' not found!`);

                if (refObj.entityType == EntityType.Object) {
                    item._ = item._ || {};
                    item._[prop.name] = await get(cn, refObj.name, {itemId: val});
                } else if (refObj.entityType == EntityType.Function) {
                    // todo: makeObjectReady for functions
                }
            }

            switch (prop._.gtype) {
                case GlobalType.file:
                    val._ = {uri: getFileUri(cn, prop, val)};
                    break;
            }

            if (prop.properties)
                await makeObjectReady(cn, prop.properties, val, options);
        }
    }
}

export function getFileUri(cn: Context, prop: Property, file: mFile): string {
    if (!file || !prop.file.drive) return null;
    let uri = joinUri(prop.file.drive._.uri, file.path, file.name).replace(/\\/g, '/');
    return `${cn.url ? cn.url.protocol : 'http:'}//${encodeURI(uri)}`; // in user login context is not completed!
}

export async function getOne(cn: Context, objectName: string) {
    return get(cn, objectName, {count: 1});
}

async function getCollection(cn: Context, objectName: string) {
    let db = await dbConnection(cn);
    return db.collection(objectName);
}

export async function put(cn: Context, objectName: string, item: any, options?: PutOptions) {
    let collection = await getCollection(cn, objectName);
    item = item || {};
    if (!options || !options.portions || options.portions.length == 1) {
        if (item._id) {
            await collection.replaceOne({_id: item._id}, item);
            return {
                type: ObjectModifyType.Update,
                item: item,
                itemId: item._id
            } as ObjectModifyState;
        } else {
            await collection.insertOne(item);
            return {
                type: ObjectModifyType.Insert,
                item: item,
                itemId: item._id
            };
        }
    }
    let portions = options.portions;
    switch (portions.length) {
        case 2: // Update new root item
            await collection.save(item);
            return ({
                type: ObjectModifyType.Update,
                item: item,
                itemId: item._id
            });

        default: // Insert / Update not root item
            let command = {$addToSet: {}};
            item._id = item._id || newID();
            let rootId = portions[1].itemId;
            let pth: string = await portionsToMongoPath(cn, rootId, portions, portions.length);
            command.$addToSet[pth] = item;
            await collection.updateOne({_id: rootId}, command);
            return {
                type: ObjectModifyType.Patch,
                item: item,
                itemId: rootId
            };
    }
}

export async function portionsToMongoPath(cn: Context, rootId: ID, portions: RefPortion[], endIndex: number) {
    if (endIndex == 3) // not need to fetch data
        return portions[2].property.name;

    let db = await dbConnection(cn);
    let collection = db.collection(portions[0].value);
    if (!collection) throw StatusCode.BadRequest;

    let value = await collection.findOne({_id: rootId});
    if (!value) throw StatusCode.ServerError;

    let path = "";
    for (let i = 2; i < endIndex; i++) {
        let part = portions[i].value;
        if (portions[i].type == RefPortionType.property) {
            path += "." + part;
            value = value[part];
            if (value == null)
                value = {}; // sample: access.items
        } else {
            let partItem = value.find(it => it._id && it._id.toString() == part);
            if (!partItem) throw StatusCode.ServerError;
            path += "." + value.indexOf(partItem);
            value = partItem;
        }
    }
    return path.replace(/^\.+|\.+$/, '');
}

export async function count(cn: Context, objectName: string, options: GetOptions) {
    let collection = await getCollection(cn, objectName);
    options = options || {} as GetOptions;
    return await collection.countDocuments(options);
}

export async function extractRefPortions(cn: Context, ref: string, _default?: string): Promise<RefPortion[]> {
    try {
        ref = _.trim(ref, '/');
        if (ref == Constants.defaultAddress) ref = "";
        ref = ref || _default;
        if (!ref)
            return null;

        let portions: RefPortion[] = ref.split('/').map(portion => {
            return {value: portion} as RefPortion;
        });

        if (portions.length === 0) return null;

        if (portions[0].value === Constants.urlPortionApi) {
            portions.shift();
            cn["mode"] = RequestMode.api;
            if (portions.length < 1) return null;
            if (/^v\d/.test(portions[0].value))
                cn["apiVersion"] = portions.shift().value;
        }

        for (let i = 1; i < portions.length; i++) {
            portions[i].pre = portions[i - 1];
        }

        let entity = glob.entities.find(entity => entity._id.toString() === portions[0].value);
        if (!entity)
            entity = glob.entities.find(en => en._.db == cn.db && en.name == portions[0].value);

        if (!entity)
            entity = glob.entities.find(en => en.name === portions[0].value && cn["app"].dependencies.indexOf(en._.db) > -1);

        if (entity) {
            portions[0].entity = entity;
            portions[0].type = RefPortionType.entity;
        } else
            return null;

        if (entity.entityType == EntityType.Object && !(entity as mObject).isList && portions.length == 1) { // e.g. systemConfig
            let item: any = await get(cn, entity.name, {count: 1});
            let portion = {type: RefPortionType.item, pre: portions[0]} as RefPortion;
            portions.push(portion);
            if (item) {
                portion.itemId = item._id;
            } else { // not any item yet
                let result: any = await put(cn, entity.name, item, null);
                portion.itemId = result.itemId;
            }
            portion.value = portion.itemId.toString();
            return portions;
        } else if (entity.entityType !== EntityType.Object || portions.length < 2)
            return portions;

        let parent: any = entity;

        for (let i = 1; i < portions.length; i++) {
            let pr = portions[i];
            if (parent == null) {
                warn(`Invalid path '${ref}'`);
                return null;
            } else if (parent._.gtype == GlobalType.file) {
                pr.type = RefPortionType.file;
            } else if ((parent.entityType || parent.isList) && /[0-9a-f]{24}/.test(pr.value)) {
                pr.type = RefPortionType.item;
                let itemId = pr.value;
                pr.itemId = newID(itemId);
            } else {
                pr.type = RefPortionType.property;
                parent = pr.property = parent.properties.find(p => p.name == pr.value);
                if (!pr.property)
                    error(`Invalid property name '${pr.value}' in path '${ref}'`);
            }
        }

        return portions;
    } catch (ex) {
        error("extractRefPortions", ex);
    }
}

export async function patch(cn: Context, objectName: string, patchData: any, options?: PutOptions) {
    let db = await dbConnection(cn);
    let collection = db.collection(objectName);
    if (!collection) throw StatusCode.BadRequest;
    if (!options) options = {portions: []};
    let portions = options.portions;
    if (!portions || !portions.length)
        portions = [{type: RefPortionType.entity, value: objectName} as RefPortion];

    if (portions.length == 1) {
        portions.push({
            type: RefPortionType.item,
            value: patchData._id.toString(),
            itemId: patchData._id
        } as RefPortion);
    }

    let theRootId = portions.length < 2 ? patchData._id : portions[1].itemId;
    let path = await portionsToMongoPath(cn, theRootId, portions, portions.length);
    let command = {$set: {}, $unset: {}};
    if (portions[portions.length - 1].property && portions[portions.length - 1].property._.gtype == GlobalType.file)
        command["$set"][path] = patchData; // e.g. multiple values for files in 'tests' object
    else
        for (const key in patchData) {
            if (key == "_id") continue;
            command[patchData[key] == null ? "$unset" : "$set"][path + (path ? "." : "") + key] = patchData[key];
        }

    if (_.isEmpty(command.$unset)) delete command.$unset;
    if (_.isEmpty(command.$set)) delete command.$set;

    let rootId = portions[1].itemId;
    let result = await collection.updateOne({_id: rootId}, command);
    return {
        type: ObjectModifyType.Patch,
        item: patchData,
        itemId: rootId
    } as ObjectModifyState;
}

export async function del(cn: Context, objectName: string, options?: DelOptions) {
    let db = await dbConnection(cn);
    let collection = db.collection(objectName);
    if (!collection) throw StatusCode.BadRequest;
    if (!options) {
        await collection.deleteMany({});
        return {
            type: ObjectModifyType.Delete
        };
    }

    if (options.itemId) {
        let result = await collection.deleteOne({_id: options.itemId});
        return {
            type: ObjectModifyType.Delete,
            item: null,
            itemId: options.itemId
        };
    }

    let portions = options.portions;
    if (portions.length == 1 || portions.length == 3)
        throw StatusCode.BadRequest;

    switch (portions.length) {
        case 2: // Delete root item
            await collection.deleteOne({_id: portions[1].itemId});
            return {
                type: ObjectModifyType.Delete,
                item: null,
                itemId: portions[1].itemId
            };

        default: // Delete nested property item
            let command = {$pull: {}};
            let rootId = portions[1].itemId;
            let itemId = portions[portions.length - 1].itemId;

            let path = await portionsToMongoPath(cn, rootId, portions, portions.length - 1);
            command.$pull[path] = {_id: itemId};
            await collection.updateOne({_id: rootId}, command);
            return {
                type: ObjectModifyType.Patch,
                item: null,
                itemId: rootId
            };
    }
}

export async function getDriveStatus(drive: Drive) {
    switch (drive.type) {
        case SourceType.File:
            try {
                // todo
                await fs.access(drive.address);
            } catch (err) {
                if (err.code == "ENOENT") {
                    await createDir(drive, drive.address);
                } else
                    throw err;
            }
            break;

        default:
            throwError(StatusCode.NotImplemented);
    }
}

export function toAsync(fn) {
    return fromCallback(fn);
}

export function getAbsolutePath(...paths: string[]): string {
    if (!paths || paths.length == 0)
        return glob.rootDir;

    let result = /^\./.test(paths[0]) ? path.join(glob.rootDir, ...paths) : path.join(...paths);
    return result;
}

export async function createDir(drive: Drive, dir: string, recursive: boolean = true) {
    switch (drive.type) {
        case SourceType.File:
            await fs.mkdir(getAbsolutePath(dir), {recursive});
            break;

        default:
            throwError(StatusCode.NotImplemented);
    }
}

export async function getFile(drive: Drive, filePath: string): Promise<Buffer> {
    switch (drive.type) {
        case SourceType.File:
            let _path = path.join(getAbsolutePath(drive.address), filePath);
            return await fs.readFile(_path);

        case SourceType.Db:
            let db = await dbConnection({db: drive._.db} as Context);
            let bucket = new mongodb.GridFSBucket(db);
            let stream = bucket.openDownloadStreamByName(filePath);
            let data: Buffer;
            return new Promise((resolve, reject) => {
                stream.on("end", function () {
                    resolve(data);
                }).on("data", function (chunk: Buffer) {
                    data = data ? Buffer.concat([data, chunk]) : chunk;
                }).on("error", function (err) {
                    reject(err);
                });
            });

        default:
            throw StatusCode.NotImplemented;
    }
}

export async function pathExists(path: string): Promise<boolean> {
    return await new Promise(resolve => fs.access(path, fs.constants.F_OK, err => resolve(!err)));
}

export async function fileExists(filePath: string, drive?: Drive): Promise<boolean> {
    if (!drive) return pathExists(filePath);

    switch (drive.type) {
        case SourceType.File:
            let _path = path.join(getAbsolutePath(drive.address), filePath);
            return await pathExists(_path);

        case SourceType.Db:
            throw StatusCode.NotImplemented;

        default:
            throw StatusCode.NotImplemented;
    }
}

export async function putFile(drive: Drive, relativePath: string, file: Buffer) {
    switch (drive.type) {
        case SourceType.File:
            let _path = path.join(getAbsolutePath(drive.address), relativePath);
            await fs.mkdir(path.dirname(_path), {recursive: true});
            await fs.writeFile(_path, file);
            break;

        case SourceType.Db:
            let db = await dbConnection({db: drive._.db} as Context);
            ;
            let bucket = new mongodb.GridFSBucket(db);
            let stream = bucket.openUploadStream(relativePath);
            await delFile(drive._.db, drive, relativePath);
            stream.on("error", function (err) {
                error("putFile error", err);
                // done(err ? StatusCode.ServerError : StatusCode.Ok);
            }).end(file);
            break;

        case SourceType.S3:
            let sdk = getS3DriveSdk(drive);
            let s3 = new sdk.S3({apiVersion: Constants.amazonS3ApiVersion});
            const config = {
                Bucket: drive.address,
                Key: relativePath,
                Body: file,
                ACL: "public-read"
            };
            let result = await s3.upload(config).promise();
            log(JSON.stringify(result));
            break;

        default:
            throw StatusCode.NotImplemented;
    }
}

export async function listDir(drive: Drive, dir: string): Promise<DirFile[]> {
    switch (drive.type) {
        case SourceType.File:
            let addr = path.join(getAbsolutePath(drive.address), dir || "");
            let list = await fsPromises.readdir(addr, {withFileTypes: true});
            let files: DirFile[] = list.map(item => {
                return {name: item.name, type: item.isDirectory() ? DirFileType.Folder : DirFileType.File} as DirFile
            });
            for (const file of files) {
                if (file.type == DirFileType.File) {
                    let stat = await fsPromises.stat(path.join(addr, file.name));
                    file.size = stat.size;
                }
            }
            return files;

        default:
            throw StatusCode.NotImplemented;

        case SourceType.S3:
            let sdk = getS3DriveSdk(drive);
            let s3 = new sdk.S3({apiVersion: Constants.amazonS3ApiVersion});
            const s3params = {
                Bucket: drive.address,
                Prefix: _.trim(dir, '/') ? _.trim(dir, '/') + "/" : "",
                Delimiter: "/",
            };
            return new Promise((resolve, reject) => {
                let regex = new RegExp("^" + s3params.Prefix);
                s3.listObjectsV2(s3params, (err, data) => {
                    if (err) {
                        if (err.code == "InvalidAccessKeyId")
                            reject(`Invalid AccessKeyId '${drive.s3.accessKeyId}': ${err.message}`);
                        else
                            reject(err);
                    } else {
                        let folders: DirFile[] = data.CommonPrefixes.map(item => {
                            return {
                                name: _.trim(item.Prefix.replace(regex, ""), '/'),
                                type: DirFileType.Folder
                            } as DirFile
                        });
                        let files: DirFile[] = data.Contents.map(item => {
                            return {
                                name: _.trim(item.Key.replace(regex, ""), '/'),
                                type: DirFileType.File,
                                size: item.Size
                            } as DirFile
                        });
                        resolve(folders.concat(files).filter(item => item.name));
                    }
                });
            });
    }
}

export async function delFile(pack: string | Context, drive: Drive, relativePath: string) {
    switch (drive.type) {
        case SourceType.File:
            let _path = path.join(getAbsolutePath(drive.address), relativePath);
            await fs.unlink(_path);
            break;

        case SourceType.S3:
            let s3 = new AWS.S3({apiVersion: Constants.amazonS3ApiVersion});
            let data: any = await s3.deleteObject({Bucket: drive.address, Key: relativePath});
            break;

        case SourceType.Db:
            //     getFileInfo(host, filePath, (err, info: file) => {
            //       if (err) return done(err);
            //
            //       let db = mem.dbs[rep._.pack];
            //       let bucket = new mongodb.GridFSBucket(db);
            //       bucket.delete(info._id, (err) => {
            //         done(err ? statusCode.notFound : statusCode.Ok);
            //       });
            //     });
            break;

        default:
            throw StatusCode.NotImplemented;
    }
}

export async function movFile(pack: string | Context, sourcePath: string, targetPath: string) {
    // let rep: repository = mem.sources[host];
    // if (!rep) return done(statusCode.notFound);
    //
    // switch (rep.type) {
    //   case objectSource.fileSystem:
    //     fs.move(path.join(rep.sourceAddress, sourcePath), (err) => {
    //       if (err) error(err);
    //       done(err ? statusCode.serverError : statusCode.Ok);
    //     });
    //     break;
    //
    //   case objectSource.db:
    //     let db = mem.dbs[rep._.pack];
    //     let bucket = new mongodb.GridFSBucket(db);
    //     let fileID = null;
    //     bucket.rename(fileID, targetPath, (err) => {
    //       done(err ? statusCode.serverError : statusCode.Ok);
    //     });
    //
    //   default:
    //     return done(statusCode.notImplemented);
    // }
}

export function joinUri(...parts: string[]): string {
    let uri = "";
    for (const part of parts) {
        if (part)
            uri += "/" + part.replace(/^\//, '').replace(/\/$/, '');
    }
    return uri.substr(1);
}

function getS3DriveSdk(drive: Drive) {
    assert(drive.s3, `S3 for drive '${drive.name}' must be configured!`);
    if (drive.s3._sdk) return drive.s3._sdk;

    let sdk = require('aws-sdk');
    if (!drive.s3.accessKeyId)
        throwError(StatusCode.ConfigurationProblem, `s3 accessKeyId for drive package '${drive._.db}' must be configured.`);
    else
        sdk.config.accessKeyId = drive.s3.accessKeyId;

    if (!drive.s3.secretAccessKey)
        throwError(StatusCode.ConfigurationProblem, `s3 secretAccessKey for drive package '${drive._.db}' must be configured.`);
    else
        sdk.config.secretAccessKey = drive.s3.secretAccessKey;
    drive.s3._sdk = sdk;
    return sdk;
}

export function silly(...message) {
    logger.silly(message);
}

export function log(...message) {
    logger.debug(message);
}

export function info(...message) {
    logger.info(message);
}

export function warn(...message) {
    logger.warn(message);
}

export function error(message: string, err?: Error | ErrorObject) {
    logger.error(err ? message + "," + err : message);
}

export function fatal(message) {
    logger.log('fatal', message);
}

export function getFullname(pack: string, name: string): string {
    if (!name) name = "";
    if (name.indexOf('.') === -1)
        name = pack + "." + name;
    return name;
}

export function isRtl(lang: Locale): boolean {
    if (!lang) return null;
    return lang === Locale.fa || lang === Locale.ar;
}

async function loadTimeZones() {
    log('loadGeneralCollections ...');

    glob.timeZones = await get({db: Constants.sysDb} as Context, Constants.timeZonesCollection);
    let result: mObject = await get({db: Constants.sysDb} as Context, SysCollection.objects, {
        query: {name: Constants.systemPropertiesObjectName},
        count: 1
    });
    if (!result) {
        logger.error("loadGeneralCollections failed terminating process ...");
        process.exit();
    }
    glob.systemProperties = result ? result.properties : [];
}

async function loadAuditTypes() {
    log('loadAuditTypes ...');
    glob.auditTypes = await get({db: Constants.sysDb} as Context, SysCollection.auditTypes);
}

function getEnabledPackages(): string[] {
    return glob.systemConfig.packages.filter(pack => pack.enabled).map(pack => pack.name);
}

async function loadPackagesInfo() {
    for (const pack of getEnabledPackages()) {
        try {
            glob.packageInfo[pack] = require(getAbsolutePath('./' + pack, `package.json`));
            // glob.packages[pack.name] = require(getAbsolutePath('./' + pack.name));
            // if (glob.packages[pack.name] == null)
            //     error(`Error loading package ${pack.name}!`);
        } catch (ex) {
            error(`Loading package.json for package '${pack}' failed!`, ex);
            glob.systemConfig.packages.find(p => p.name == pack).enabled = false;
        }
    }
}

async function loadSystemConfig() {
    let collection = await getCollection({db: Constants.sysDb} as Context, SysCollection.systemConfig);
    glob.systemConfig = await collection.findOne({});
}

function applyAmazonConfig() {
    AWS.config.accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    AWS.config.secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
}

async function loadPackageSystemCollections(db: string) {
    log(`Loading system collections db '${db}' ...`);
    let cn = {db} as Context;

    let hosts: Host[] = await get(cn, SysCollection.hosts);
    for (const host of hosts) {
        host._ = {db};
        glob.hosts.push(host);
    }

    let objects: mObject[] = await get(cn, SysCollection.objects);
    for (const object of objects) {
        object._ = {db};
        object.entityType = EntityType.Object;
        glob.entities.push(object as Entity);
    }

    let functions: Function[] = await get(cn, SysCollection.functions);
    for (const func of functions) {
        func._ = {db};
        func.entityType = EntityType.Function;
        glob.entities.push(func as Entity);
    }

    let config: AppConfig = await getOne(cn, SysCollection.appConfig);
    if (config)
        glob.appConfig[db] = config;

    let forms: Form[] = await get(cn, SysCollection.forms);
    for (const form of forms) {
        form._ = {db};
        form.entityType = EntityType.Form;
        glob.entities.push(form as Entity);
    }

    let texts: Text[] = await get(cn, SysCollection.dictionary);
    for (const item of texts) {
        glob.dictionary[db + "." + item.name] = item.text;
    }

    let menus: Menu[] = await get(cn, SysCollection.menus);
    for (const menu of menus) {
        menu._ = {db};
        glob.menus.push(menu);
    }

    let roles: Role[] = await get(cn, SysCollection.roles);
    for (const role of roles) {
        role._ = {db};
        glob.roles.push(role);
    }

    let drives: Drive[] = await get(cn, SysCollection.drives);
    for (const drive of drives) {
        drive._ = {db};
        glob.drives.push(drive);
    }
}

export function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
}

function enabledDbs() {
    return glob.systemConfig.dbs.filter(db => db.enabled).map(db => db.name);
}

async function loadSystemCollections() {
    glob.entities = [];
    glob.dictionary = {};
    glob.menus = [];
    glob.roles = [];
    glob.drives = [];
    glob.apps = [];
    glob.hosts = [];

    for (const db of enabledDbs()) {
        try {
            await loadPackageSystemCollections(db);
        } catch (err) {
            error("loadSystemCollections", err);
        }
    }
}

export function configureLogger(silent: boolean) {
    let logDir = getAbsolutePath('./logs');
    const logLevels = {
        levels: {
            fatal: 0,
            error: 3,
            warn: 4,
            notice: 5,
            info: 6,
            debug: 7,
            silly: 8
        },
        colors: {
            fatal: 'red',
            error: 'red',
            warn: 'yellow',
            notice: 'green',
            info: 'white',
            debug: 'gray',
            silly: 'gray'
        }
    };

    let transports: any[] = [
        new logger.transports.File(
            {
                filename: path.join(logDir, Constants.ErrorLogFile),
                // maxsize: mem.sysConfig.log.maxSize,
                level: 'error',
                format: logger.format.printf(info => `${moment().format('DD-HH:mm:ss.SS')}  ${info.level}\t${info.message}`),
            }),
        new logger.transports.File(
            {
                filename: path.join(logDir, Constants.InfoLogFile),
                // maxsize: mem.sysConfig.log.maxSize,
                level: 'debug',
                format: logger.format.printf(info => `${moment().format('DD-HH:mm:ss.SS')}  ${info.level}\t${info.message}`),
            })
    ];
    if (!silent)
        transports.unshift(new logger.transports.Console({
            level: 'silly', format: logger.format.combine(
                logger.format.simple(),
                logger.format.printf(msg => logger.format.colorize().colorize(msg.level, "" + msg.message)))
        }));
    logger.configure(<logger.LoggerOptions>{levels: logLevels.levels, exitOnError: false, transports});
    logger.addColors(logLevels.colors);
}

export async function downloadLogFiles(cn: Context) {
    let logDir = getAbsolutePath('./logs');
    let fileName = `log-files-${Math.ceil(Math.random() * 10000000)}.zip`;

    let tempPath = getAbsolutePath('./drive-default/temp');
    try {
        await fsAsync.mkdir(tempPath);
    } catch (e) {

    }
    let stream = fs.createWriteStream(path.join(tempPath, fileName));
    let archive = archiver('zip', {
        zlib: {level: 9} // Sets the compression level.
    });
    archive.directory(logDir, false);
    archive.finalize();
    await new Promise(resolve => archive.pipe(stream).on("finish", resolve));
    cn.res = cn.res || {};
    cn.res.redirect = `/@default/temp/${fileName}`;
}

function validateApp(pack: string, app: App): boolean {
    return true;
}

export function initializeRoles() {
    let g = new graphlib.Graph();
    for (const role of glob.roles) {
        g.setNode(role._id.toString());
        for (const subRole of role.roles || []) {
            g.setEdge(role._id.toString(), subRole.toString());
        }
    }

    for (const role of glob.roles) {
        let result = graphlib.alg.postorder(g, role._id.toString());
        role.roles = result.map(item => newID(item));
    }
}

function templateRender(pack, template) {
    try {
        let render = ejs.compile(template);
        return render;
    } catch (err) {
        error(`templateRender error for pack '${pack}': `, err.stack);
        return null;
    }
}

function initializePackages() {
    log(`initializePackages: ${glob.systemConfig.packages.map(p => p.name).join(' , ')}`);

    let sysTemplate = glob.appConfig[Constants.sysDb].apps[0].template;
    let sysTemplateRender = templateRender(Constants.sysDb, sysTemplate);

    for (const db of enabledDbs()) {
        let config = glob.appConfig[db];
        for (const app of (config.apps || [])) {
            app._ = {db};
            app.dependencies = app.dependencies || [];
            app.dependencies.push(Constants.sysDb);

            if (app.template)
                app._.templateRender = templateRender(db, app.template);
            else
                app._.templateRender = sysTemplateRender;

            if (app.menu) app._.menu = glob.menus.find(menu => menu._id.equals(app.menu));
            if (app.navmenu) app._.navmenu = glob.menus.find(menu => menu._id.equals(app.navmenu));

            if (validateApp(db, app)) {
                glob.apps.push(app);
            }
        }
    }
}

function checkPropertyGtype(prop: Property, entity: Entity) {
    if (!prop.type) {
        if (prop.properties && prop.properties.length) {
            prop._.gtype = GlobalType.object;
            return;
        } else {
            warn(`property '${entity._.db}.${entity.name}.${prop.name}' type is empty!`);
            return;
        }
    }

    switch (prop.type.toString()) {
        case PType.boolean:
            prop._.gtype = GlobalType.boolean;
            return;

        case PType.text:
            prop._.gtype = GlobalType.string;
            return;

        case PType.number:
            prop._.gtype = GlobalType.number;
            return;

        case PType.location:
            prop._.gtype = GlobalType.location;
            return;

        case PType.time:
            prop._.gtype = GlobalType.time;
            return;

        case PType.file:
            prop._.gtype = GlobalType.file;
            return;

        case PType.id:
            prop._.gtype = GlobalType.object;
            return;

        case PType.obj:
            prop._.gtype = GlobalType.object;
            // when type is object, always it will be edited by 'document-editor'
            prop.documentView = true;
            return;
    }

    prop._.isRef = true;
    prop._.enum = findEnum(prop.type);
    if (prop._.enum) {
        prop._.gtype = GlobalType.number;
        return;
    }

    let type = findEntity(prop.type);
    if (type == null) {
        prop._.gtype = GlobalType.unknown;
        warn(`Property '${prop.name}' invalid type '${prop.type}' not found. entity: ${entity.name}!`);
        return;
    }

    if (type.entityType == EntityType.Function) {
        let func = type as Function;
        if (func.returnType && func.returnType.toString() == PType.text)
            prop._.gtype = GlobalType.string;
        else
            prop._.gtype = GlobalType.id;
    } else {
        let refType = prop.referType;
        if (!refType)
            refType = prop.type ? PropertyReferType.select : PropertyReferType.inlineData;

        switch (refType) {
            case PropertyReferType.select:
                prop._.gtype = GlobalType.id;
                break;

            case PropertyReferType.outbound:
                prop._.isRef = false;
                prop._.gtype = GlobalType.object;
                break;

            case PropertyReferType.inlineData:
                prop._.isRef = false;
                prop._.gtype = GlobalType.object;
                break;
        }
    }
}

export async function dbConnection(cn: Context, connectionString?: string): Promise<mongodb.Db> {
    let key = cn.db + ":" + connectionString;
    if (glob.dbs[key]) return glob.dbs[key];
    connectionString = connectionString || process.env.DB_ADDRESS;
    if (!connectionString)
        throw("Environment variable 'DB_ADDRESS' is needed.");

    try {
        let dbc = await MongoClient.connect(connectionString, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            poolSize: Constants.mongodbPoolSize
        });
        if (!dbc)
            return null;
        return glob.dbs[key] = dbc.db(cn.db);
    } catch (e) {
        error(e.stack);
        error(`db '${cn.db}' connection failed [${connectionString}]`);
        throw `connecting to db '${cn.db}' failed`;
    }
}

export function findEnum(type: ID): Enum {
    if (!type) return null;
    return glob.enums.find(enm => enm._id.equals(type));
}

export function findEntity(id: ID): Entity {
    if (!id) return null;
    return glob.entities.find(a => a._id.equals(id));
}

export function findObject(db: string | Context, objectName: string): mObject {
    if (typeof db != "string")
        db = db.db;
    return glob.entities.find(a => a._.db == db && a.name == objectName && a.entityType == EntityType.Object) as mObject;
}

export async function initializeEnums() {
    log('initializeEnums ...');
    glob.enums = [];
    glob.enumTexts = {};

    for (const db of enabledDbs()) {
        let enums: Enum[] = await get({db} as Context, SysCollection.enums);
        for (const theEnum of enums) {
            theEnum._ = {db};
            glob.enums.push(theEnum);

            let texts = {};
            _.sortBy(theEnum.items, Constants.indexProperty).forEach(item => texts[item.value] = item.title || item.name);
            glob.enumTexts[db + "." + theEnum.name] = texts;
        }
    }
}

export function allObjects(cn: Context): mObject[] {
    let ss = glob.entities.filter(en => !en._);
    return glob.entities.filter(en => en.entityType == EntityType.Object && (!cn || containsPack(cn, en._.db))) as mObject[];
}

export function allFunctions(cn: Context): Function[] {
    return glob.entities.filter(en => en.entityType == EntityType.Function && (!cn || containsPack(cn, en._.db))) as Function[];
}

async function initializeEntities() {
    log(`Initializing '${allObjects(null).length}' Objects ...`);
    let allObjs = allObjects(null);
    for (const obj of allObjs) {
        obj._.inited = false;
    }

    for (const obj of allObjs) {
        initObject(obj);
    }

    for (const db of enabledDbs()) {
        let config = glob.appConfig[db];
        let obj = findObject(db, SysCollection.appConfig);
        await makeObjectReady({db} as Context, obj.properties, config);
        for (const app of config.apps) {
            app._.loginForm = Constants.defaultLoginUri;
            if (app.loginForm) {
                let entity = findEntity(app.loginForm);
                if (entity) app._.loginForm = entity.name;
            }
        }
    }

    log(`Initializing '${allFunctions(null).length}' functions ...`);
    for (const func of allFunctions(null)) {
        try {
            func._.access = {};
            func._.access[func._.db] = func.access;
            func.pack = func.pack || glob.appConfig[func._.db].defaultPack;
            assert(func.pack, `Function needs unknown pack, or default pack in PackageConfig needed!`);
            initProperties(func.properties, func, func.title);
        } catch (ex) {
            error("Init functions, Module: " + func._.db + ", Action: " + func.name, ex);
        }
    }
}

function checkFileProperty(prop: Property, entity: Entity) {
    if (prop._.gtype == GlobalType.file) {
        if (prop.file && prop.file.drive) {
            prop.file.drive = glob.drives.find(d => d._id.equals(prop.file.drive as any));
            if (!prop.file.drive)
                error(`drive for property file '${entity._.db}.${entity.name}.${prop.name}' not found.`);
        } else if (entity.entityType == EntityType.Object)
            error(`drive for property file '${entity._.db}.${entity.name}.${prop.name}' must be set.`);
    }
}

function checkForSystemProperty(prop: Property) {
    if (!prop.type && !prop.properties) {
        let sysProperty: Property = glob.systemProperties.find(p => p.name === prop.name);
        if (sysProperty)
            _.defaultsDeep(prop, sysProperty);
    }
}

export function initProperties(properties: Property[], entity: Entity, parentTitle?) {
    if (!properties) return;
    for (const prop of properties) {
        prop._ = {};
        checkForSystemProperty(prop);
        prop.group = prop.group || parentTitle;
        checkPropertyGtype(prop, entity);
        checkFileProperty(prop, entity);
        initProperties(prop.properties, entity, prop.title);
    }
}

export function initObject(obj: mObject) {
    try {
        if (obj._.inited)
            return;
        else
            obj._.inited = true;

        obj.properties = obj.properties || [];
        obj._.autoSetInsertTime = _.some(obj.properties, {name: SystemProperty.time});
        obj._.access = {};
        obj._.access[obj._.db] = obj.access;
        initProperties(obj.properties, obj);

        if (obj.reference) {
            let referenceObj = findEntity(obj.reference) as mObject;
            if (!referenceObj)
                return warn(`SimilarObject in service '${obj._.db}' not found for object: '${obj.title}', SimilarReference:${obj.reference}`);

            initObject(referenceObj);
            applyAttrsFromReferencedObject(obj, referenceObj);
            compareParentProperties(obj.properties, referenceObj.properties, obj);
        } else if (obj.properties) {
            for (const prop of obj.properties) {
                checkPropertyReference(prop, obj);
            }
        }
    } catch (ex) {
        error(`initObject, Error in object ${obj._.db}.${obj.name}`, ex);
    }
}

function applyAttrsFromReferencedObject(obj: mObject, referenceObj: mObject) {
    let newProps = obj.properties;
    delete obj.properties;

    _.defaultsDeep(obj, referenceObj);
    for (let newProp of newProps) {
        let changedProp = obj.properties.find(p => p.name == newProp.name);
        if (!changedProp)
            obj.properties.push(newProp);
        else {
            _.assign(changedProp, newProp);
        }
    }
}

function checkPropertyReference(property: Property, entity: Entity) {
    if (property._.gtype == GlobalType.object && (!property.properties || !property.properties.length)) {
        let propertyParentObject = findEntity(property.type) as mObject;
        if (!propertyParentObject) {
            if (property._.gtype == GlobalType.object) return;
            return error(`Property '${entity._.db}.${entity.name}.${property.name}' type '${property.type}' not found.`);
        }

        initObject(propertyParentObject);

        property.properties = property.properties || [];
        if (!property._.parentPropertiesCompared) {
            property._.parentPropertiesCompared = true;
            compareParentProperties(property.properties, propertyParentObject.properties, entity);
        }
    } else if (property.properties)
        for (const prop of property.properties) {
            checkPropertyReference(prop, entity);
        }
}

function compareParentProperties(properties: Property[], parentProperties: Property[], entity: Entity) {
    if (!parentProperties)
        return;

    let parentNames = parentProperties.map(p => p.name);
    properties.filter(p => parentNames.indexOf(p.name) == -1).forEach(newProperty => checkPropertyReference(newProperty, entity));

    for (const parentProperty of parentProperties) {
        let property: Property = properties.find(p => p.name === parentProperty.name);
        if (!property) {
            //properties.push(_.cloneDeep(parentProperty));  // e.x. Objects > View Elem > Properties > Panel > Sub Properties > StackPanel
            properties.push(parentProperty);
            continue;
        }

        _.defaultsDeep(property, parentProperty);

        if (property.referType == PropertyReferType.inlineData && property.type) {
            try {
                let propertyParentObject = findEntity(property.type) as mObject;
                if (!propertyParentObject) {
                    error(`(HandleSimilarProperty) Object '${property.type}' not found as property ${property.title} reference.`);
                    continue;
                }

                if (!propertyParentObject._.inited)
                    initObject(propertyParentObject);

                if (!property._.parentPropertiesCompared) {
                    property._.parentPropertiesCompared = true;
                    compareParentProperties(property.properties, propertyParentObject.properties, entity);
                }
            } catch (ex) {
                error(ex);
            }
        } else {
            if ((parentProperty.properties && parentProperty.properties.length > 0) && !property.group)
                property.group = property.title;

            if (!property._.parentPropertiesCompared) {
                property._.parentPropertiesCompared = true;
                compareParentProperties(property.properties, parentProperty.properties, entity);
            }
        }
    }
}

export function getEntityName(id) {
    let obj = findEntity(id);
    return obj ? obj.name : null;
}

export function $t(cn: Context, text, useDictionary?: boolean): string {
    return getText(cn, text, useDictionary);
}

export function getText(cn: Context, text, useDictionary?: boolean): string {
    if (cn == null || !cn.locale) return (text || "").toString();
    if (!text) return "";

    if (typeof text == "string" && useDictionary)
        text = glob.dictionary[cn.db + "." + text] || glob.dictionary["sys." + text] || text;

    if (typeof text == "string")
        return text;

    let localeName = Locale[cn.locale];
    if (text[localeName])
        return text[localeName];
    else
        return _.values(text)[0];
}

export async function verifyEmailAccounts(cn: Context) {
    assert(glob.appConfig[cn.db].emailAccounts, `Email accounts is empty`);

    for (const account of glob.appConfig[cn.db].emailAccounts) {
        const transporter = nodemailer.createTransport({
            //service: 'gmail',
            host: account.smtpServer,
            port: account.smtpPort,
            secure: account.secure,
            auth: {user: account.username, pass: account.password}
        });

        await new Promise((resolve, reject) => {
            transporter.verify(function (err) {
                if (err) {
                    reject(err);
                } else {
                    info(`Account '${account.username}' is verified!`);
                    resolve();
                }
            });
        });
    }
}

export async function sendEmail(cn: Context, from: string, to: string, subject: string, content: string, params?: SendEmailParams) {
    assert(glob.appConfig[cn.db].emailAccounts, `Email accounts is empty`);

    const account = glob.appConfig[cn.db].emailAccounts.find(account => account.email == from);
    assert(account, `Email account for account '${from}' not found!`);

    const transporter = nodemailer.createTransport({
        host: account.smtpServer,
        port: account.smtpPort,
        secure: account.secure,
        auth: {user: account.username, pass: account.password}
    });

    if (params && params.fromName)
        from = `"${params.fromName}" <${from}>`;

    let mailOptions = {from, to, subject} as any;
    if (params && params.isHtml)
        mailOptions.html = content;
    else
        mailOptions.text = content;

    return new Promise((resolve, reject) => {
        transporter.sendMail(mailOptions, function (err, info) {
            if (err) {
                error(`Sending email from '${from}' to '${to} failed`);
                reject(err);
            } else {
                resolve(info.response);
            }
        });
    });
}

export async function sendSms(cn: Context, provider, from: string, to: string, text: string, params?: SendSmsParams): Promise<StatusCode> {
    assert(glob.appConfig[cn.db].smsAccounts, `Sms accounts is empty`);
    const account = glob.appConfig[cn.db].smsAccounts.find(account => account.provider.toLowerCase().trim() == provider.toLowerCase().trim())

    return new Promise((resolve, reject) => {
        switch (provider) {
            case SmsProvider.Infobip:
                // set options
                const auth = 'Basic ' + Buffer.from(account.username + ':' + account.password).toString('base64');
                const url = new URL(account.uri);
                const data = JSON.stringify({from, to, text});
                const options = {
                    hostname: url.hostname,
                    path: url.pathname,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Authorization': auth
                    }
                };

                // Send https request
                const req = https.request(options, res => resolve(res.statusCode));
                req.on('error', reject);
                req.write(data);
                req.end();
                break;

            default:
                throwError(StatusCode.NotImplemented);
        }
    });
}

export function getEnumText(thePackage: string, dependencies: string[], enumType: string, value: number, locale?: Locale) {
    if (value == null)
        return "";

    let theEnum = getEnumByName(thePackage, dependencies, enumType);
    if (!theEnum)
        return value;

    let text = theEnum[value];
    return getText({locale}, text);
}

export function getEnumItems(cn: Context, enumName: string): Pair[] {
    let theEnum = glob.enums.find(e => e.name == enumName);
    if (!theEnum) return null;
    return theEnum.items.map(item => {
        return {ref: item.value, title: getText(cn, item.title)};
    });
}

export function getEnumByName(thePackage: string, dependencies: string[], enumType: string) {
    let theEnum = glob.enumTexts[thePackage + "." + enumType];

    for (let i = 0; !theEnum && i < dependencies.length; i++) {
        theEnum = glob.enumTexts[dependencies[i] + "." + enumType];
    }

    return theEnum;
}

export function isRightToLeftLanguage(loc: Locale) {
    return loc == Locale.ar || loc == Locale.fa;
}

export function encodeXml(text) {
    return (text || "").toString().replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

export function jsonToXml(json) {
    return xmlBuilder.create(json).toString();
}

export function setIntervalAndExecute(fn, t) {
    fn();
    return (setInterval(fn, t));
}

export function getAllFiles(path) {
    path = _.trim(path, '/');
    if (fs.statSync(path).isFile())
        return [path];
    return _.flatten(fs.readdirSync(path).map(file => {
        let fileOrDir = fs.statSync(joinUri(path, file));
        if (fileOrDir.isFile())
            return (path + '/' + file).replace(/^\.\/\/?/, '');
        else if (fileOrDir.isDirectory())
            return getAllFiles(joinUri(path, file));
    }));
}

export function getPackageInfo(pack: string): PackageInfo {
    let config = glob.packageInfo[pack];
    if (!config)
        throw `config for package '${pack}' not found.`;

    // reload package.json
    config = require(getAbsolutePath('./' + pack, `package.json`)) as PackageInfo;
    return config;
}

export function getPathSize(path) {
    let files = getAllFiles(path);
    let totalSize = 0;
    files.forEach(function (f) {
        totalSize += fs.statSync(f).size;
    });
    return totalSize;
}

export function applyFileQuota(dir, quota) {
    while (true) {
        let rootPathes = fs.readdirSync(dir);
        let size = getPathSize(dir);
        if (size < quota)
            break;

        let oldestPath = _.minBy(rootPathes, function (f: string) {
            let fullPath = path.join(dir, f);
            return fs.statSync(fullPath).ctime;
        });

        oldestPath = path.join(dir, oldestPath);
        try {
            fs.removeSync(oldestPath);
        } catch (ex) {
            error(`Can not remove path: '${oldestPath}'`);
        }
    }
}

export function toQueryString(obj: any) {
    let str = '';
    for (const key in obj) {
        str += '&' + key + '=' + obj[key];
    }
    return str.slice(1);
}

export function digitGroup(value: number) {
    if (!value) return "0";
    return value.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,");
}

export function jsonReviver(key, value) {
    if (value && value.toString().indexOf("__REGEXP ") == 0) {
        let m = value.split("__REGEXP ")[1].match(/\/(.*)\/(.*)?/);
        return new RegExp(m[1], m[2] || "");
    } else if (value && value.toString().indexOf("__Reference ") == 0) {
        return newID(value.split("__Reference ")[1]);
    } else
        return value;
}

export function parseDate(loc: Locale, date: string): Date {
    if (!date) return null;

    let match = date.match(/(\d+)\/(\d+)\/(\d+)/);
    if (!match)
        return new Date(date);

    let year = parseInt(match[1]);
    let month = parseInt(match[2]);
    let day = parseInt(match[3]);

    let result = null;

    if (loc == Locale.fa) {
        if (day > 31) // means year is in right
        {
            let t = day;
            day = year;
            year = t;
        }
        if (year < 100)
            year = year + 1300;

        if (year > 1500)
            result = new Date(year, month - 1, day);
        else
            result = Jalali(year + "/" + month + "/" + day, 'jYYYY/jM/jD').toDate();
    } else
        result = new Date(year, month, day);

    match = date.match(/(\d+):(\d+):?(\d+)?/);
    if (match && result) {
        result.setHours(parseInt(match[1]) || 0);
        result.setMinutes(parseInt(match[2]) || 0);
        result.setSeconds(parseInt(match[3]) || 0);
    }
    return result;
}

export async function getTypes(cn: Context) {
    let objects: any[] = allObjects(cn).map(ent => {
        let title = getText(cn, ent.title) + (cn.db == ent._.db ? "" : " (" + ent._.db + ")");
        return {...ent, title}
    });
    let functions: any[] = allFunctions(cn).map(ent => {
        let title = getText(cn, ent.title) + (cn.db == ent._.db ? "" : " (" + ent._.db + ")");
        return {...ent, title}
    });
    let enums: any[] = glob.enums.filter(en => containsPack(cn, en._.db)).map(ent => {
        let title = getText(cn, ent.title) + (cn.db == ent._.db ? "" : " (" + ent._.db + ")");
        return {...ent, title}
    });

    let types = objects.concat(functions, enums);
    types = _.orderBy(types, ['title']);

    let ptypes: any[] = [];
    for (const type in PType) {
        ptypes.push({_id: newID(PType[type]), title: getText(cn, type, true)});
    }

    types.unshift({_id: null, title: "-"});
    types = ptypes.concat(types);
    return types;
}

export function containsPack(cn: Context, pack: string): boolean {
    return pack == cn.db || cn["app"].dependencies.indexOf(pack) > -1;
}

export async function getDataEntities(cn: Context) {
    let entities = glob.entities.filter(e => e.entityType == EntityType.Function || e.entityType == EntityType.Object);
    return makeEntityList(cn, entities);
}

export function getAllEntities(cn: Context) {
    let entities = glob.entities.filter(en => containsPack(cn, en._.db));
    return makeEntityList(cn, entities);
}

export function makeEntityList(cn: Context, entities: Entity[]) {
    let items = entities.map(ent => {
        let title = getText(cn, ent.title) + (cn.db == ent._.db ? "" : " (" + ent._.db + ")");
        let _cs = null;
        switch (ent.entityType) {
            case EntityType.Object:
                _cs = Constants.ClassStyle_Object;
                break;
            case EntityType.Function:
                _cs = Constants.ClassStyle_Function;
                break;
            case EntityType.Form:
                _cs = Constants.ClassStyle_Form;
                break;
        }
        return {_id: ent._id, title, _cs};
    });
    return _.orderBy(items, ['title']);
}

export function json2bson(doc: any): any {
    return EJSON.deserialize(doc);
}

export function bson2json(doc: any): any {
    return EJSON.serialize(doc);
}

export function stringify(value): string {
    value._0 = "";

    const getCircularReplacer = () => {
        const seen = new WeakSet();
        return (key, value) => {
            if (typeof value === "object" && value !== null) {
                if (seen.has(value)) {
                    return {_$: value._0};
                }

                for (const attr in value) {
                    let val = value[attr];
                    if (val) {
                        if (val.constructor == ObjectId)
                            value[attr] = {"$oid": val.toString()};

                        if (val instanceof Date)
                            value[attr] = {"$date": val.toString()};
                    }
                }
                seen.add(value);
            }
            return value;
        };
    };

    const seen = new WeakSet();
    const setKeys = (obj, parentKey) => {
        if (seen.has(obj)) return;
        seen.add(obj);

        for (const key in obj) {
            let val = obj[key];
            if (!val) continue;
            if (typeof val === "object" && val.constructor != ObjectId) {
                if (val._0 == null) {
                    val._0 = parentKey + (Array.isArray(obj) ? `[${key}]` : `['${key}']`);
                }
                setKeys(val, val._0);
            }
        }
    };

    setKeys(value, "");
    let str = JSON.stringify(value, getCircularReplacer());
    return str;
}

export function parse(str: string | any): any {
    let json = typeof str == "string" ? JSON.parse(str) : str;
    let keys = {};
    const findKeys = obj => {
        if (obj && obj._0) {
            keys[obj._0] = obj;
            delete obj._0;
        }

        for (const key in obj) {
            if (typeof obj[key] === "object")
                findKeys(obj[key]);
        }
    };

    const seen = new WeakSet();
    const replaceRef = obj => {
        if (seen.has(obj)) return;
        seen.add(obj);

        for (const key in obj) {
            let val = obj[key];
            if (!val) continue;
            if (typeof val === "object") {
                if (val.$oid) {
                    obj[key] = newID(val.$oid);
                    continue;
                }
                if (val.$date) {
                    obj[key] = new Date(val.$date);
                    continue;
                }
                if (val._$ == "") {
                    obj[key] = json;
                } else if (val._$) {
                    obj[key] = eval('json' + val._$);
                }

                replaceRef(val);
            }
        }
    };

    delete json._0;
    findKeys(json);
    replaceRef(json);

    return json;
}

export async function getPropertyReferenceValues(cn: Context, prop: Property, instance: any) {
    if (prop._.enum) {
        let items = prop._.enum.items.map(item => {
            return {ref: item.value, title: getText(cn, item.title)} as Pair;
        });
        return items;
    }

    let entity = findEntity(prop.type);
    if (!entity) {
        throwError(StatusCode.ServerError, `Property '${prop.name}' type '${prop.type}' not found.`);
    }

    if (entity.entityType == EntityType.Object) {
        let result = await get({db: cn.db} as Context, entity.name, {count: 10});
        if (result) {
            return result.map(item => {
                return {ref: item._id, title: getText(cn, item.title)} as Pair;
            });
        } else
            return null;
    } else if (entity.entityType === EntityType.Function) {
        let typeFunc = entity as Function;
        let args = [];
        if (typeFunc.properties)
            for (const param of typeFunc.properties) {
                switch (param.name) {
                    case "meta":
                        args.push(prop);
                        break;

                    case "item":
                        args.push(instance); //  || cn.httpReq.body
                        break;

                    default:
                        args.push(null);
                        break;
                }
            }

        return await invoke(cn, typeFunc, args);
    }
}

function mockCheckMatchInput(cn: Context, func: Function, args: any[], sample: FunctionTestSample): boolean {
    for (const key in sample.input) {
        if (!_.isEqual(sample.input[key], cn.req[key]))
            return false;
    }
    return true;
}

export async function mock(cn: Context, func: Function, args: any[]) {
    log(`mocking function '${cn.db}.${func.name}' ...`);

    if (!func.test.samples || !func.test.samples.length)
        return {code: StatusCode.Ok, message: "No sample data!"};

    let withInputs = func.test.samples.filter(sample => sample.input);
    for (const sample of withInputs) {
        if (mockCheckMatchInput(cn, func, args, sample)) {
            if (sample.code)
                return {code: sample.code, message: sample.message, result: sample.result};
            else
                return sample.input;
        }
    }

    let withoutInput: FunctionTestSample = func.test.samples.find(sample => !sample.input);
    if (withoutInput) {
        if (withoutInput.code)
            return {code: withoutInput.code, message: withoutInput.message};
        else
            return withoutInput.input;
    }

    return {code: StatusCode.Ok, message: "No default sample data!"};
}

async function invokeFuncMakeArgsReady(cn: Context, func: Function, action, args: any[]) {
    if (!func.properties)
        return args;

    const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
    const ARGUMENT_NAMES = /([^\s,]+)/g;

    let fnStr = action.toString().replace(STRIP_COMMENTS, '');
    let argNames = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);
    if (argNames === null)
        argNames = [];
    if (argNames[0] == "cn")
        argNames.shift();

    let argData = {};
    argNames.forEach((argName, i) => argData[argName] = args[i]);

    let fileParams = func.properties.filter(p => p._.gtype == GlobalType.file);
    if (fileParams.length) {
        let uploadedFiles = await getUploadedFiles(cn, true);

        for (const param of fileParams) {
            if (param.isList)
                throwError(StatusCode.NotImplemented, `no support for multiple files params!`);

            let val: mFile = argData[param.name];
            if (val) {
                let file = uploadedFiles.find(f => f.name == val.name);
                if (!file)
                    throwError(StatusCode.BadRequest, `parameter '${param.name}' is mandatory!`);
                val._ = val._ || {};
                val._.rawData = file.rawData;
            }
        }
    }

    for (const prop of func.properties) {
        let val = argData[prop.name];
        if (val == null && prop.required)
            throwError(StatusCode.BadRequest, `parameter '${prop.name}' is mandatory!`);

        if (prop._.isRef && !prop._.enum && prop.viewMode != PropertyViewMode.Hidden && isID(val)) {
            let refObj = findEntity(prop.type);
            if (!refObj)
                throwError(StatusCode.UnprocessableEntity, `referred object for property '${cn.db}.${prop.name}' not found!`);

            if (refObj.entityType == EntityType.Object)
                argData[prop.name] = await get({db: cn.db} as Context, refObj.name, {itemId: val});
            else if (refObj.entityType == EntityType.Function) {
                // todo: makeObjectReady for functions
            }
        }
    }

    return Object.values(argData);
}

export async function invoke(cn: Context, func: Function, args: any[]) {
    if (func.test && func.test.mock && process.env.NODE_ENV == EnvMode.Development && cn.url.pathname != "/functionTest") {
        return await mock(cn, func, args);
    }

    let pathPath = getAbsolutePath('./' + (func.pack == "web" ? "web/src/web" : func.pack));
    let action = require(pathPath)[func.name];
    if (!action) {
        if (!action) {
            let app = glob.apps.find(app => app._.db == cn.db);
            for (const pack of app.dependencies) {
                action = require(pathPath)[func.name];
                if (action)
                    break;
            }
        }
    }
    if (!action) throw StatusCode.NotImplemented;
    args = await invokeFuncMakeArgsReady(cn, func, action, args);

    let result;
    if (args.length == 0)
        result = await action(cn);
    else
        result = await action(cn, ...args);
    return result;
}

export async function getUploadedFiles(cn: Context, readBuffer: boolean): Promise<UploadedFile[]> {
    let files: UploadedFile[] = [];
    assert(cn["httpReq"].files, "files is not ready in the request");
    for (const file of cn["httpReq"].files) {
        let buffer;
        if (readBuffer) {
            buffer = await fs.readFile(file.path);
            await fs.remove(file.path);
        }
        let fileInfo: UploadedFile = {name: file.originalname, rawData: buffer, path: file.path};
        files.push(fileInfo);
    }
    return files;
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
        bcrypt.compare(password, hash, function (err, result) {
            if (err) reject(err);
            else resolve(result);
        });
    });
}

export async function hashPassword(password: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const saltRounds = 10;
        bcrypt.hash(password, saltRounds, function (err, hash) {
            if (err) reject(err);
            else resolve(hash);
        });
    });
}

export async function runFunction(cn: Context, functionId: ID, input: any) {
    let func = findEntity(functionId) as Function;
    if (!func) throw StatusCode.NotFound;

    input = input || {};
    let args = [];
    if (func.properties)
        for (const para of func.properties) {
            args.push(input[para.name]);
        }

    return invoke(cn, func, args);
}

export async function resetPassword(cn: Context, newPassword: string, confirm: string) {
    if (!cn.user) throw StatusCode.Unauthorized;
    if (newPassword != confirm) throwError(StatusCode.BadRequest, "Password confirm error!");
    let hash = await hashPassword(newPassword);
    let date = new Date();
    date.setDate(date.getDate() + Constants.PASSWORD_EXPIRE_AGE);
    await patch(cn, SysCollection.users, {_id: cn.user._id, password: hash, passwordExpireTime: date} as User);
}

export async function changePassword(cn: Context, oldPassword: string, newPassword: string, confirm: string) {
    if (!await comparePassword(oldPassword, cn.user.password)) throwError(StatusCode.BadRequest, "Invalid old password!");
    await resetPassword(cn, newPassword, confirm);
}

export function isID(value: any): boolean {
    if (!value) return false;
    return value._bsontype;
}

export function throwError(code: StatusCode, message?: string) {
    throw new ErrorObject(code, message);
}

export function getReference(id?: string): ID {
    return newID(id);
}

export function clientLog(cn: Context, message: string, type: LogType = LogType.Debug, ref?: string) {
    logger.log(LogType[type].toLowerCase(), message);
    glob.postClientCommandCallback(cn, ClientCommand.Log, message, type, ref);
}

export function clientCommand(cn: Context, command: ClientCommand, ...args) {
    glob.postClientCommandCallback(cn, command, ...args);
}

export async function removeDir(dir: string) {
    return new Promise((resolve, reject) => {
        rimraf(dir, {silent: true}, ex => {
            if (ex)
                reject(ex);
            else
                resolve();
        });
    });
}

export async function clientQuestion(cn: Context, message: string, optionsEnum: string): Promise<number> {
    return new Promise(resolve => {
        let items = getEnumItems(cn, optionsEnum);
        let waitFn = answer => resolve(answer);
        let questionID = newID().toString();
        glob.clientQuestionCallbacks[cn["httpReq"].session.id + ":" + questionID] = waitFn;
        glob.postClientCommandCallback(cn, ClientCommand.Question, questionID, message, items);
    });
}

export function clientAnswerReceived(sessionId: string, questionID: string, answer: number | null) {
    let waitFn = glob.clientQuestionCallbacks[sessionId + ":" + questionID];
    if (waitFn) {
        waitFn(answer);
        delete glob.clientQuestionCallbacks[sessionId + ":" + questionID];
    } else
        error(`clientQuestionCallbacks not found for session:'${sessionId}', question:'${questionID}'`);
}

export function clientNotify(cn: Context, title: string, message: string, url: string, icon?: string) {
    glob.postClientCommandCallback(cn, ClientCommand.Notification, title, message, url, icon);
}

export async function execShellCommand(cmd, std?: (message: string) => void): Promise<string> {
    return new Promise((resolve: (message: string) => void) => {
        let process = exec(cmd);
        let message = "";
        let logData = data => {
            if (std)
                std(data.toString());
            else {
                log(data.toString());
            }
            message += data.toString();
        };
        process.stdout.on('data', logData);
        process.stderr.on('data', logData);
        process.on('exit', function (code) {
            resolve(message);
        });
    });
}

export function sort(array: any[], prop: string): void {
    function compare(a, b) {
        if (a[prop] < b[prop]) {
            return -1;
        }
        if (a[prop] > b[prop]) {
            return 1;
        }
        return 0;
    }

    array.sort(compare);
}
