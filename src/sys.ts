let index = {
    "Start                                              ": reload,
    "   loadSystemCollections                           ": loadSystemCollections,
    "   loadHosts                                       ": loadHosts,

    "Initialize Entities                                ": initializeEntities,
    "   Initialize Object                               ": initObject,
    "       Initialize Properties                       ": initProperties,

    "get                                                ": get,
    "patch                                              ": patch,
    "put                                                ": put,
};


import qs = require('qs');
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
import aws = require('aws-sdk');
import rimraf = require("rimraf");
import {ID, stringify} from 'bson-util';
import {promises as fsAsync} from "fs";
import {MongoClient, MongoCountPreferences, ObjectId} from 'mongodb';
import maxmind, {CountryResponse} from 'maxmind';
import {fromCallback} from 'universalify';
import * as Url from "url";
import {
    Access,
    AccessAction,
    App,
    AppGroup,
    AuditArgs,
    ClientCommand,
    Constants,
    Context,
    Country,
    DelOptions,
    DirFile,
    DirFileType,
    Drive,
    Entity,
    EntityLink,
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
    Locale,
    LogType,
    Menu,
    mFile,
    mObject,
    ObjectDec,
    ObjectModifyState,
    ObjectModifyType,
    Objects,
    ObjectSourceClass,
    ObjectViewType,
    Pair,
    Property,
    PropertyEditMode,
    PropertyReferType,
    PropertyViewMode,
    PType,
    PutOptions,
    RefPortion,
    RefPortionType,
    ReqParams,
    Role,
    SendEmailParams,
    SendSmsParams,
    Service,
    ServiceConfig,
    SmsProvider,
    SourceType,
    StatusCode,
    SysAuditTypes,
    SystemProperty,
    Text,
    UploadedFile,
    User,
    ClusterConfig, EmailAccount,
} from './types';

const nodemailer = require('nodemailer');
const assert = require('assert').strict;
const {exec} = require("child_process");
export let glob = new Global();
const fsPromises = fs.promises;
const bcrypt = require('bcrypt');

async function loadHosts() {
    glob.hosts = [];

    let hosts: Host[] = await get({db: process.env.NODE_NAME}, Objects.hosts);
    let services: Service[] = await get({db: process.env.NODE_NAME}, Objects.services, {query: {enabled: true}});

    for (const host of hosts) {
        let service = services.find(c => c._id.equals(host.service));
        host._ = {db: service.name};
        let serviceConfig = glob.serviceConfigs[service.name];
        host._.apps = serviceConfig._.apps;
        host.aliases = host.aliases || [];
        host._.defaultApp = glob.apps.find(app => app._id.equals(host.defaultApp));
        glob.hosts.push(host);
    }
}

export async function reload(cn?: Context) {
    let startTime = moment();
    log(`reload ...`);
    glob.suspendService = true;

    await globalCheck();
    await applyAmazonConfig();
    await loadSystemCollections();
    await loadServiceConfigs();
    await loadTimeZones();
    await loadAuditTypes();
    await initializeEnums();
    await initializePackages();
    await loadHosts();
    await initializeRoles();
    await initializeEntities();
    await initializeRolePermissions();

    glob.suspendService = false;

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
        await put(cn, Objects.audits, args);

        // exist on FaTAL ERROR
        // process.exit();
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

export async function getByID(cn: Context | string, objectName: string, id: ID) {
    if (!id) return null;
    return get(cn, objectName, {itemId: id});
}

export async function get(cn: Context | string, objectName: string, options?: GetOptions) {
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

export async function max(cn: Context, objectName: string, property: string) {
    let collection = await getCollection(cn, objectName);
    let sort = {};
    sort[property] = -1;

    let maxDoc = await collection.find().sort(sort).limit(1).toArray();
    if (!maxDoc || maxDoc.length == 0) return null;
    return maxDoc[0][property];
}

export async function makeObjectReady(cn: Context | string, properties: Property[], data: any, options: GetOptions = null) {
    if (!data) return;
    if (typeof cn == "string") cn = {db: cn} as Context;

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
    if (!file || !prop.file || !prop.file.drive) return null;
    let drive = glob.drives.find(d => d._id.equals(prop.file.drive));
    let uri = joinUri(drive._.uri, file.path, file.name).replace(/\\/g, '/');
    return `${cn.url ? cn.url.protocol : 'http:'}//${encodeURI(uri)}`; // in user login context is not completed!
}

export async function getOne(cn: Context | string, objectName: string) {
    return get(cn, objectName, {count: 1});
}

export async function getCollection(cn: Context | string, objectName: string) {
    let db = await dbConnection(cn);
    return db.collection(objectName);
}

export async function put(cn: Context | string, objectName: string, data: any, options?: PutOptions): Promise<ObjectModifyState> {
    let collection = await getCollection(cn, objectName);
    data = data || {};
    if (!options || !options.portions || options.portions.length == 1) {
        if (Array.isArray(data)) {
            await collection.insertMany(data);
            return {
                type: ObjectModifyType.Insert,
                items: data
            };
        } else if (data._id && data._new) {
            delete data._new;
            await collection.insertOne(data);
            return {
                type: ObjectModifyType.Insert,
                item: data,
                itemId: data._id
            };
        } else if (data._id) {
            await collection.replaceOne({_id: data._id}, data);
            return {
                type: ObjectModifyType.Update,
                item: data,
                itemId: data._id
            } as ObjectModifyState;
        } else {
            await collection.insertOne(data);
            return {
                type: ObjectModifyType.Insert,
                item: data,
                itemId: data._id
            };
        }
    }
    let portions = options.portions;
    switch (portions.length) {
        case 2: // Update new root item
            await collection.save(data);
            return ({
                type: ObjectModifyType.Update,
                item: data,
                itemId: data._id
            });

        default: // Insert / Update not root item
            let command = {$addToSet: {}};
            assert(data._id, `_id expected for inserting!`);
            delete data._new; // we add _new in new inline item either
            let rootId = portions[1].itemId;
            let pth: string = await portionsToMongoPath(cn, rootId, portions, portions.length);
            command.$addToSet[pth] = data;
            await collection.updateOne({_id: rootId}, command);
            return {
                type: ObjectModifyType.Patch,
                item: data,
                itemId: rootId
            };
    }
}

export function evalExpression($this: any, expression: string): any {
    try {
        if (!expression) return expression;
        return eval(expression.replace(/\bthis\b/g, '$this'));
    } catch (ex) {
        error(`Evaluating '${expression}' failed! this:` + ex.message);
    }
}

export async function portionsToMongoPath(cn: Context | string, rootId: ID, portions: RefPortion[], endIndex: number) {
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
    let query = options.query || {};
    return await collection.countDocuments(query, null as MongoCountPreferences);
}

export async function patch(cn: Context | string, objectName: string, patchData: any, options?: PutOptions) {
    let db = await dbConnection(cn);
    let collection = db.collection(objectName);
    if (!collection) throw StatusCode.BadRequest;

    // Use patch in normal case
    if (options && options.filter && !options.portions) {
        let command = {} as any;
        for (let key in patchData) {
            if (patchData[key] == null) {
                command.$unset = command.$unset || {};
                command.$unset[key] = "";
            } else {
                command.$set = command.$set || {};
                command.$set[key] = patchData[key];
            }
        }
        let result = await collection.updateOne(options.filter, command);
        return {
            type: ObjectModifyType.Patch,
        } as ObjectModifyState;
    }

    if (!options) options = {portions: []};
    let portions = options.portions;

    if (!portions.length)
        portions = [{type: RefPortionType.entity, value: objectName} as RefPortion];

    if (portions.length < 2)
        assert(patchData._id, `_id is expected in patch data.`);

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
    let filter = (options && options.filter) ? options.filter : {_id: rootId};
    let result = await collection.updateOne(filter, command);
    return {
        type: ObjectModifyType.Patch,
        item: patchData,
        itemId: rootId
    } as ObjectModifyState;
}

export async function del(cn: Context | string, objectName: string, options?: DelOptions) {
    let db = await dbConnection(cn);
    let collection = db.collection(objectName);
    if (!collection) throw StatusCode.BadRequest;
    if (!options) {
        await collection.deleteMany({});
        return {type: ObjectModifyType.Delete};
    }

    if (options.query) {
        await collection.deleteMany(options.query);
        return {type: ObjectModifyType.Delete};
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

export function findDrive(cn: Context, driveName: string): Drive {
    return glob.drives.find(drive => drive._.db == cn.db && drive.title == driveName);
}

export function toAsync(fn) {
    return fromCallback(fn);
}

export function getAbsolutePath(...paths: string[]): string {
    if (!paths || paths.length == 0)
        return process.env.ROOT_DIR;

    let result = /^\./.test(paths[0]) ? path.join(process.env.ROOT_DIR, ...paths) : path.join(...paths);
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

export async function putFileProperty(cn: Context, objectName: string, item: any, propertyName: string, fileName: string, buffer: Buffer) {
    if (!buffer || !buffer.length) return;

    let obj = findObject(cn, objectName);
    assert(obj, `putFileProperty Invalid objectName: ${objectName}`);

    // Find Property
    let property = obj.properties.find(p => p.name == propertyName);
    assert(property, `putFileProperty Invalid property: '${objectName}.${propertyName}'`);
    assert(property.file && property.file.drive, `putFileProperty Property: '${propertyName}' should have file config`);

    // Find Drive And Put File
    let drive = glob.drives.find(d => d._id.equals(property.file.drive));
    let relativePath = joinUri(property.file.path, fileName);
    await putFile(drive, relativePath, buffer);

    // Update Property File Value
    let file = {name: fileName, size: buffer.length, path: property.file.path} as mFile;
    let patchData = {};
    patchData[propertyName] = file;
    await patch(cn, objectName, patchData, {filter: {_id: item._id}});

    // Update Original Item
    file._ = {uri: getFileUri(cn, property, file)};
    item[propertyName] = file;
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
            let bucket = new mongodb.GridFSBucket(db);
            let stream = bucket.openUploadStream(relativePath);
            await delFile(drive._.db, drive, relativePath);
            stream.on("error", function (err) {
                error("putFile error", err);
                // done(err ? StatusCode.ServerError : StatusCode.Ok);
            }).end(file);
            break;

        case SourceType.S3:
            try {
                let s3 = new aws.S3({apiVersion: Constants.amazonS3ApiVersion, region: process.env.AWS_S3_REGION});
                const config = {
                    Bucket: drive.address,
                    Key: relativePath,
                    Body: file,
                    ACL: "public-read"
                };
                return await s3.upload(config).promise();
            } catch (ex) {
                error(`putFile error, drive: ${drive.title}`, ex);
                throwError(StatusCode.ConfigurationProblem, `Could not save the file due to a problem.`);
            }
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
            let s3 = new aws.S3({apiVersion: Constants.amazonS3ApiVersion});
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
                            reject(`Invalid AccessKeyId: ${err.message}`);
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
            let s3 = new aws.S3({apiVersion: Constants.amazonS3ApiVersion});
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
    let result: mObject = await get({db: Constants.sysDb} as Context, Objects.objects, {
        query: {name: Constants.systemPropertiesObjectName},
        count: 1
    });

    let countries: Country[] = await get({db: Constants.sysDb} as Context, Objects.countries);
    for (const country of countries) {
        glob.countries[country.code] = country;
    }

    if (!result) {
        logger.error("loadGeneralCollections failed terminating process ...");
        process.exit();
    }
    glob.systemProperties = result ? result.properties : [];
}

async function loadAuditTypes() {
    log('loadAuditTypes ...');
    glob.auditTypes = await get({db: Constants.sysDb} as Context, Objects.auditTypes);
}

async function globalCheck() {
    assert(process.env.DB_ADDRESS, "Environment variable 'DB_ADDRESS' is needed.")
    assert(process.env.NODE_NAME, "Environment variable 'NODE_NAME' is needed.")
    assert(process.env.CLUSTER_NAME, "Environment variable 'CLUSTER_NAME' is needed.")

    try {
        await MongoClient.connect(process.env.DB_ADDRESS, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            poolSize: Constants.mongodbPoolSize
        });
    } catch (ex) {
        fatal("Error connecting to the database: " + ex.message);
    }
}

function applyAmazonConfig() {
    aws.config.accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    aws.config.secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    aws.config.region = process.env.AWS_DEFAULT_REGION;
}

async function loadPackageSystemCollections(db: string) {
    log(`Loading system collections db '${db}' ...`);
    let cn = {db} as Context;

    let apps: App[] = await get(cn, Objects.apps);
    for (const app of apps) {
        app._ = {db};
        app.dependencies = app.dependencies || [];
        app.dependencies = [...app.dependencies, 'sys', 'web'].filter(onlyUnique);
        glob.apps.push(app);
    }

    let objects: mObject[] = await get(cn, Objects.objects);
    for (const object of objects) {
        object._ = {db};
        object.entityType = EntityType.Object;
        glob.entities.push(object as Entity);
    }

    let functions: Function[] = await get(cn, Objects.functions);
    for (const func of functions) {
        func._ = {db};
        func.entityType = EntityType.Function;
        glob.entities.push(func as Entity);
    }

    let forms: Form[] = await get(cn, Objects.forms);
    for (const form of forms) {
        form._ = {db};
        form.entityType = EntityType.Form;
        glob.entities.push(form as Entity);
    }

    let texts: Text[] = await get(cn, Objects.dictionary);
    for (const item of texts) {
        glob.dictionary[db + "." + item.name] = item.text;
    }

    let menus: Menu[] = await get(cn, Objects.menus);
    for (const menu of menus) {
        menu._ = {db};
        glob.menus.push(menu);
    }

    let roles: Role[] = await get(cn, Objects.roles);
    for (const role of roles) {
        role._ = {db};
        glob.roles.push(role);
    }

    let drives: Drive[] = await get(cn, Objects.drives);
    for (const drive of drives) {
        drive._ = {db};
        glob.drives.push(drive);
    }
}

export function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
}

async function loadServiceConfigs() {
    glob.serviceConfigs = {};

    let appGroups: AppGroup[] = await get({db: Constants.sysDb}, Objects.appGroups);

    for (const db of glob.services) {
        let serviceConfig: ServiceConfig = await getOne({db}, Objects.serviceConfig);
        if (!serviceConfig) {
            error(`Service Config for service '${db}' is not ready!`);
            glob.services.splice(glob.services.indexOf(db), 1);
            continue;
        }
        glob.serviceConfigs[db] = serviceConfig;

        let apps: ID[];
        if (serviceConfig.appGroup)
            apps = appGroups.find(ap => ap._id.equals(serviceConfig.appGroup)).apps;
        else
            apps = serviceConfig.apps;

        serviceConfig._ = {apps: []};
        if (!apps) continue;
        serviceConfig._.apps = apps.map(a => glob.apps.find(app => app._id.equals(a))).filter(Boolean);
    }
}

async function loadSystemCollections() {
    glob.entities = [];
    glob.dictionary = {};
    glob.menus = [];
    glob.roles = [];
    glob.drives = [];
    glob.apps = [];

    // Load Services
    let services: Service[] = await get({db: process.env.NODE_NAME}, Objects.services, {query: {enabled: true}});
    glob.services = services.map(s => s.name);

    for (const db of glob.services) {
        try {
            glob.dbs[db] = null;
            await loadPackageSystemCollections(db);
        } catch (err) {
            error("loadSystemCollections", err);
        }
    }
}

export function configureLogger(silent: boolean) {
    let logDir = getAbsolutePath(process.env.LOGS_PATH);
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
    cn.res = cn.res || {} as any;
    cn.res.redirect = `/@default/temp/${fileName}`;
}

export function initializeRolePermissions(justEntity?: ID) {
    // Set objects access base on role access permissions
    for (const role of glob.roles) {
        if (!role.permissions) continue;

        for (let permit of role.permissions) {
            let entity = findEntity(permit.obj || permit.func || permit.form);
            if (!entity || (justEntity && !justEntity.equals(entity._id))) continue;

            entity._.permissions = entity._.permissions || [];
            let permission: AccessAction = (permit.objAction || permit.funcAction || permit.formAction) as number;
            entity._.permissions.push({role: role._id, permission} as Access);
        }
    }
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
    log(`initializePackages`);

    let sysTemplateRender = templateRender(Constants.sysDb, Constants.DEFAULT_APP_TEMPLATE);

    for (const app of glob.apps) {
        app.dependencies = app.dependencies || [];
        app.dependencies.push(Constants.sysDb);

        if (app.template)
            app._.templateRender = templateRender(app._.db, app.template);
        else
            app._.templateRender = sysTemplateRender;

        if (app.menu) app._.menu = glob.menus.find(menu => menu._id.equals(app.menu));
    }
}

export function checkPropertyGtype(prop: Property, entity: Entity, parentProperty: Property = null) {
    if (!prop.type) {
        if (prop.properties && prop.properties.length) {
            prop._.gtype = GlobalType.object;
            return;
        } else {
            if (!parentProperty || (parentProperty.referType != PropertyReferType.inlineData))
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
            if (prop.properties) delete prop.properties; // If switch from sub items to multiple list, DetailsView needs to know it has no child
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

            case PropertyReferType.inlineData:
                prop._.isRef = false;
                prop._.gtype = GlobalType.object;
                break;
        }
    }
}

export async function dbConnection(cn: Context | string, connectionString?: string): Promise<mongodb.Db> {
    if (typeof cn == "string") cn = {db: cn} as Context;
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

    for (const db of glob.services) {
        let enums: Enum[] = await get({db} as Context, Objects.enums);
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
    return glob.entities.filter(en => en.entityType == EntityType.Object && (!cn || containsPack(cn, en._.db))) as mObject[];
}

export function allFunctions(cn: Context): Function[] {
    return glob.entities.filter(en => en.entityType == EntityType.Function && (!cn || containsPack(cn, en._.db))) as Function[];
}

export function allForms(cn: Context): Form[] {
    return glob.entities.filter(en => en.entityType == EntityType.Form && (!cn || containsPack(cn, en._.db))) as Form[];
}

async function initializeEntities() {
    log(`Initializing '${allObjects(null).length}' Objects ...`);
    let allObjs = allObjects(null);
    for (const obj of allObjs) {
        obj._.inited = false;
    }

    for (const obj of allObjs) {
        await initObject(obj);
    }

    // for (const client of glob.clients) {
    //     let config = glob.clientConfig[client._.db];
    //     let obj = findObject(client._.db, Objects.clientConfig);
    //     if (!obj) {
    //         error(`clientConfig for client '${client.code}' not found!`);
    //         continue;
    //     }
    //     await makeObjectReady({db: "c" + client.code} as Context, obj.properties, config);
    // }

    log(`Initializing '${allFunctions(null).length}' functions ...`);
    for (const func of allFunctions(null)) {
        try {
            await initProperties(func.properties, func, func.title, null);
        } catch (ex) {
            error("Init functions, Module: " + func._.db + ", Action: " + func.name, ex);
        }
    }
}

function checkFileProperty(prop: Property, entity: Entity) {
    if (prop._.gtype == GlobalType.file) {
        if (prop.file && prop.file.drive) {
            let drive = glob.drives.find(d => d._id.equals(prop.file.drive as any));
            if (!drive)
                error(`drive for property file '${entity._.db}.${entity.name}.${prop.name}' not found.`);
            else
                prop._.fileUri = drive._.uri;
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

export function initProperties(properties: Property[], entity: Entity, parentTitle: any, parentProperty: Property) {
    if (!properties) return;
    for (const prop of properties) {
        prop._ = {};
        checkForSystemProperty(prop);
        prop.group = prop.group || parentTitle;
        checkPropertyGtype(prop, entity, parentProperty);
        checkFileProperty(prop, entity);
        if (prop.number && prop.number.autoIncrement) prop.editMode = PropertyEditMode.Readonly;

        initProperties(prop.properties, entity, prop.title, prop);
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
        obj._.filterObject = findEntity(obj.filterObject) as mObject;
        initProperties(obj.properties, obj, null, null);

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
    for (let newProperty of properties.filter(p => parentNames.indexOf(p.name) == -1)) {
        checkPropertyReference(newProperty, entity);
    }

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
                    error(`(HandleSimilarProperty) Property '${entity.name}.${property.name}' type not found!`);
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
    assert(glob.serviceConfigs[cn.db].emailAccounts, `Email accounts is empty`);

    for (const account of glob.serviceConfigs[cn.db].emailAccounts) {
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
    let account: EmailAccount;
    if (cn.service.sso) {
        let config: ClusterConfig = await getOne(process.env.CLUSTER_NAME, Objects.clusterConfig);
        account = config.emailAccounts.find(account => account.email == from);
    } else {
        assert(glob.serviceConfigs[cn.db].emailAccounts, `Email accounts is empty`);
        account = glob.serviceConfigs[cn.db].emailAccounts.find(account => account.email == from);
    }

    assert(account, `Email account for account '${from}' not found!`);
    const transporter = nodemailer.createTransport({
        host: account.smtpServer,
        port: account.smtpPort,
        secure: account.secure,
        auth: {user: account.username, pass: account.password}
    });

    if (params && params.attachments)
        transporter.attachments = params.attachments.map(item => {
            return {
                filename: item.name,
                path: path.dirname(item._.uri)
            };
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
                log(`Sending email from '${from}' to '${to} done!`);
                resolve(info.response);
            }
        });
    });
}

export async function sendSms(cn: Context, provider, from: string, to: string, text: string, params?: SendSmsParams): Promise<StatusCode> {
    assert(glob.serviceConfigs[cn.db].smsAccounts, `Sms accounts is empty`);
    const account = glob.serviceConfigs[cn.db].smsAccounts.find(account => account.provider.toLowerCase().trim() == provider.toLowerCase().trim())

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

export function getEnumText(cn: Context, enumType: string, value: number): string {
    if (value == null)
        return "";

    let theEnum = getEnumByName(cn.db, cn.app ? cn.app.dependencies : null, enumType);
    if (!theEnum)
        return value.toString();

    let text = theEnum[value];
    return getText(cn, text);
}

export function getEnumItems(cn: Context, enumName: string): Pair[] {
    let theEnum = glob.enums.find(e => e.name == enumName);
    if (!theEnum) return null;
    return theEnum.items.map(item => {
        return {ref: item.value, title: getText(cn, item.title)};
    });
}

export function getEnum(cn: Context, enumName: string): Enum {
    return glob.enums.find(e => e.name == enumName);
}

export function getEnumByName(thePackage: string, dependencies: string[], enumType: string): any {
    let theEnum = glob.enumTexts[thePackage + "." + enumType];
    if (!theEnum && dependencies)
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

export function containsPack(cn: Context, db: string): boolean {
    return db == cn.db || cn.app.dependencies.indexOf(db) > -1 || cn.app._.db == db;
}

export async function getDataEntities(cn: Context) {
    let entities = glob.entities.filter(e => e.entityType == EntityType.Function || e.entityType == EntityType.Object);
    return makeEntityList(cn, entities);
}

export function getAllEntities(cn: Context) {
    let entities = glob.entities.filter(en => cn.db == en._.db || cn.app.dependencies.indexOf(en._.db) > -1);
    let end = entities.find((e => e.name == "clients"));
    return makeEntityList(cn, entities);
}

export async function dropDatabase(dbName: string) {
    let db = await dbConnection({db: dbName});
    return db.dropDatabase();
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

async function getInnerPropertyReferenceValues(cn: Context, foreignObj: mObject, db: string, prop: Property, instance: any): Promise<Pair[]> {
    assert(prop.dependsOn, `DependsOn property must be set for InnerSelectType property: ${prop.name}`);
    assert(prop.foreignProperty, `ForeignProperty must be set for InnerSelectType property: ${prop.name}`);
    // assert(obj.properties.find(p => p.name == prop.dependsOn), `Depends On Property '${prop.dependsOn}' not found!`);

    let val = instance ? instance[prop.dependsOn] : null;
    if (!val) return [];
    let result = await get({db}, foreignObj.name, {itemId: val});
    if (!result) return [];

    let foreignProp = foreignObj.properties.find(p => p.name == prop.foreignProperty);
    assert(foreignProp, `Foreign property '${prop.foreignProperty}' not found!`);

    let foreignTitleProp = foreignProp.properties.find(p => foreignProp.titleProperty ? p.name == foreignObj.titleProperty : p.name == Constants.titlePropertyName);
    assert(foreignTitleProp, `Foreign object needs the title property`);

    let items = result[prop.foreignProperty];
    if (!items) return [];

    if (!Array.isArray(items)) {
        error(`ForeignProperty must be an array InnerSelectType property: ${prop.name}`);
        return [];
    }

    return items.map(item => {
        let title;
        if (foreignTitleProp.formula)
            title = evalExpression(item, foreignTitleProp.formula);
        else
            title = item[foreignTitleProp.name];
        return {
            ref: item._id,
            title: getText(cn, title)
        } as Pair;
    });
}

export function getEntityDatabase(cn: Context, entity: Entity): string {
    if (entity.entityType == EntityType.Object) {
        let obj = entity as mObject;
        switch (obj.sourceClass) {
            case ObjectSourceClass.Default:
                return cn.host._.db;

            case ObjectSourceClass.Cluster:
                return process.env.CLUSTER_NAME;

            case ObjectSourceClass.Node:
                return process.env.NODE_NAME;

            case ObjectSourceClass.ObjectSource:
                return cn.app._.db;
        }
    }

    return cn.host._.db;
}

async function getPropertyObjectReferenceValues(cn: Context, obj: mObject, prop: Property, instance: any, phrase: string, query: any): Promise<Pair[]> {
    let db = getEntityDatabase(cn, obj);
    if (prop.filter && !query)
        return [];

    if (prop.referType == PropertyReferType.InnerSelectType) {
        if (Array.isArray(instance)) {
            let values = [];
            for (let item of instance) {
                values = values.concat(await getInnerPropertyReferenceValues(cn, obj, db, prop, item));
            }
            return values;
        } else
            return await getInnerPropertyReferenceValues(cn, obj, db, prop, instance);
    } else if (phrase == "") {
        // When call from client side on-change
    } else if (phrase != null) {
        let titlePropName = obj.titleProperty || "title";
        let titleProp = obj.properties.find(p => p.name == titlePropName);
        if (titleProp) {
            let phraseQuery;
            if (titleProp.text && titleProp.text.multiLanguage) {
                let filterGlobal = {};
                let filterLocalize = {};
                filterGlobal[titlePropName] = new RegExp(phrase, "i");
                filterLocalize[titlePropName + "." + Locale[cn.locale]] = new RegExp(phrase, "i");
                phraseQuery = {$or: [filterGlobal, filterLocalize]};
            } else {
                phraseQuery = {};
                phraseQuery[titlePropName] = new RegExp(phrase, "i");
            }
            query = query ? {$and: [query, phraseQuery]} : phraseQuery;
        }
    } else if (!query) {
        if (Array.isArray(instance)) {
            let values = instance.filter(i => i[prop.name]).map(i => i[prop.name]);
            if (values.length)
                query = {_id: {$in: values}};
        } else if (instance) {
            let value = instance[prop.name];
            if (value) {
                if (Array.isArray(value)) // Multi value property
                    query = {_id: {$in: value}};
                else
                    query = {_id: value};
            }
        }
    }

    let result = await get({db}, obj.name, {count: Constants.referenceValuesLoadCount, query});
    if (result)
        return result.map(item => {
            return {
                ref: item._id,
                title: getText(cn, (obj as mObject).titleProperty ? item[(obj as mObject).titleProperty] : item.title)
            } as Pair;
        });
    else
        throw StatusCode.NotFound;
}

async function getPropertyFunctionReferenceValues(cn: Context, func: Function, prop: Property, instance: any, phrase: string, query: any): Promise<Pair[]> {
    let args = [];
    if (func.properties)
        for (const param of func.properties) {
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

    try {
        let items = await invoke(cn, func, args);
        if (items == null) return [];

        if (!Array.isArray(items)) {
            error('getPropertyReferenceValues: the function result must be an array of Pair.');
        } else {
            items = items.map(item => {
                let title = getText(cn, item.title, false) || item.name;
                let pair = {title, ref: item._id} as Pair;
                if (item._cs) pair._cs = item._cs;
                return pair;
            });

            if (phrase)
                items = items.filter(item => item.title && item.title.toLowerCase().indexOf(phrase.toLowerCase()) > -1);
        }
        return items;
    } catch (ex) {
        error(`getPropertyReferenceValues: the function '${func.name}' invoke failed: ${ex.message}`);
        return [];
    }
}

export async function getPropertyReferenceValues(cn: Context, prop: Property, instance: any, phrase: string, query: any): Promise<Pair[]> {
    if (prop._.enum)
        return (prop._.enum.items || []).map(item => {
            return {ref: item.value, title: getText(cn, item.title)} as Pair;
        });

    let entity = findEntity(prop.type);
    assert(entity, `Property '${prop.name}' type '${prop.type}' not found.`);

    if (entity.entityType == EntityType.Object)
        return await getPropertyObjectReferenceValues(cn, entity as mObject, prop, instance, phrase, query);
    else if (entity.entityType == EntityType.Function)
        return await getPropertyFunctionReferenceValues(cn, entity as Function, prop, instance, phrase, query);

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

        if (prop._.gtype == GlobalType.object && typeof val == "string")
            argData[prop.name] = newID(val);

        if (prop._.isRef && !prop._.enum && prop.viewMode != PropertyViewMode.Hidden && prop.useAsObject && isID(val)) {
            let refObj = findEntity(prop.type);
            if (!refObj)
                throwError(StatusCode.UnprocessableEntity, `referred object for property '${cn.db}.${prop.name}' not found!`);

            if (refObj.entityType == EntityType.Object)
                argData[prop.name] = await getByID(await getEntityDatabase(cn, refObj), refObj.name, val);
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

    let pathPath = getAbsolutePath('./' + (func._.db == "web" ? "web/src/web" : func._.db));
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

export function isID(value: any): boolean {
    if (!value) return false;
    return value._bsontype;
}

export function throwError(code: StatusCode, message?: string) {
    throw new ErrorObject(code, message);
}

export function throwContextError(cn: Context, code: StatusCode, message?: string) {
    message = message || getErrorCodeMessage(cn, code);
    throw new ErrorObject(code, message);
}

export function getErrorCodeMessage(cn: Context, code: StatusCode): string {
    return `${$t(cn, "error")} (${code}): ${getEnumText(cn, "StatusCode", code)}`;
}

export function checkUserRole(cn: Context, role: ID): boolean {
    if (!cn.user) return false;
    return !!cn.user.roles.find(role => role.equals(role));
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

export async function clientQuestion(cn: Context, title: string, message: string, optionsEnum: string): Promise<number> {
    return new Promise(resolve => {
        let items = getEnumItems(cn, optionsEnum);
        let waitFn = answer => resolve(answer);
        let questionID = newID().toString();
        glob.clientQuestionCallbacks[cn["httpReq"].session.id + ":" + questionID] = waitFn;
        glob.postClientCommandCallback(cn, ClientCommand.Question, title, message, items, questionID);
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

export function sort(array: any[], prop: string = "_z"): void {
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

export async function countryNameLookup(ip: string): Promise<string> {
    if (/^::/.test(ip))
        return "[LOCAL]";
    let countryCode = await countryLookup(ip);
    let country = countryCode ? glob.countries[countryCode] : null;
    if (country)
        return country.name;
    else
        return null;
}

export async function countryLookup(ip: string): Promise<string> {
    const file = getAbsolutePath('./sys/assets/GeoLite2-Country.mmdb');
    const lookup = await maxmind.open<CountryResponse>(file);
    let result = lookup.get(ip);
    if (!result || !result.country) {
        error(`Country for ip '${ip}' not found.`);
        return null;
    }
    return result.country.iso_code; // inferred type maxmind.CityResponse
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

export function getPortionProperties(cn: Context, obj: mObject, portion: RefPortion, data, viewType: ObjectViewType): Property[] {
    let props: Property[];
    switch (portion.type) {
        case RefPortionType.entity:
            props = _.cloneDeep(obj.properties);
            break;

        case RefPortionType.item:
            return getPortionProperties(cn, obj, portion.pre, data, viewType);

        case RefPortionType.property:
            props = _.cloneDeep(portion.property.properties);
            break;
    }

    return filterAndSortProperties(cn, props, true, _.isArray(data), viewType);
}

export function filterAndSortProperties(cn: Context, properties: Property[], root: boolean, gridView: boolean, viewType: ObjectViewType): Property[] {
    if (!properties || !properties.length) return properties;

    let result = properties.filter(p => p.viewMode !== PropertyViewMode.Hidden);
    if (viewType != ObjectViewType.TreeView && gridView)
        result = result.filter(p => {
            return p.viewMode !== PropertyViewMode.DetailViewVisible &&
                p.type &&
                (!p.text || !p.text.password) &&
                (p._.gtype != GlobalType.object) &&  // Access  || !p.isList
                (p.referType != PropertyReferType.inlineData || !p._.isRef || glob.enums[getEntityName(p.type)]) &&
                (root || !(p.isList && p.properties && p.properties.length > 0));
        });

    if (viewType != ObjectViewType.TreeView)
        result = result.filter(p => checkPropertyPermission(p, cn.user) != AccessAction.None);

    result = _.sortBy(result, "_z");

    for (const prop of result) {
        if (prop._.sorted) continue;
        prop._.sorted = true;

        if (prop.properties)
            prop.properties = filterAndSortProperties(cn, prop.properties, false, prop.isList, viewType);
    }

    return result;
}

function checkPropertyPermission(property: Property, user: User): AccessAction {
    return AccessAction.Full;
    // TODO: property access control
    // try {
    //     if (!property.access)
    //         return AccessAction.Full;
    //
    //     //info(`Property ${property.Name}`);
    //
    //     let permission = AccessAction.None;
    //
    //     if (user && property.access && property.access.items) {
    //         property.access.items.forEach(function (access: AccessItem) {
    //             if (user._id.equals(access.user)) {
    //                 permission = access.permission;
    //             }
    //             if (access.role && _.some(user.roles, function (g) {
    //                 return access.role.equals(g);
    //             })) {
    //                 permission = access.permission;
    //             }
    //         });
    //     }
    //
    //     if (!permission && !property.access.items)
    //         permission = AccessAction.Full;
    //
    //     //sys.info(`Permission ${permission}`);
    //
    //     return permission as AccessAction;
    // } catch (ex) {
    //     error("checkPropertyPermission", ex);
    //     return AccessAction.None;
    // }
}

export async function createDeclare(cn: Context, ref: string, properties: Property[], data: any, partial, obj: mObject, links: EntityLink[]): Promise<ObjectDec> {
    let dec = {
        ref,
        properties: _.cloneDeep(properties),
        pages: cn.pages,
        count: cn.count,
        page: cn.page,
        comment: $t(cn, obj.comment),
        access: cn["access"],
        links,
        rowHeaderStyle: obj.rowHeaderStyle,
        reorderable: obj.reorderable,
    } as ObjectDec;

    let portion = cn.portions[cn.portions.length - 1];
    if (portion.type == RefPortionType.entity && obj.newItemMode)
        dec.newItemMode = obj.newItemMode;

    if (obj.detailsViewType)
        dec.detailsViewType = obj.detailsViewType;

    if (obj.listsViewType)
        dec.listsViewType = obj.listsViewType;

    if (Array.isArray(data) && cn["pages"] && cn.portions.length == 1) // When it is not a direct GET, cn.pages would be empty
        dec.pageLinks = getPageLinks(cn, dec.ref);

    for (const prop of dec.properties) {
        await preparePropertyDeclare(cn, ref, prop, data, partial, dec.access);
    }

    await handleObjectDeclareFilter(obj, cn, ref, dec);
    return dec;
}

async function handleObjectDeclareFilter(obj: mObject, cn: Context, ref: string, dec: ObjectDec) {
    if (obj._.filterObject) {
        let filterProperties = _.cloneDeep(obj._.filterObject.properties.filter(p => p.viewMode != PropertyViewMode.Hidden));

        let filterData;
        if (cn.query)
            filterData = cn.query;
        else {
            filterData = {};
            await applyPropertiesDefaultValue(cn, filterData, filterProperties);
        }

        for (const prop of filterProperties) {
            await preparePropertyDeclare(cn, ref, prop, filterData, false, dec.access);
            if (filterData[prop.name] == undefined)
                filterData[prop.name] = null;
        }

        dec.filterDec = {properties: filterProperties};
        dec.filterData = filterData;
    }
}

export async function applyPropertiesDefaultValue(cn: Context, instance: any, properties: Property[]) {
    if (!properties) return;
    for (let property of properties) {
        if (property.defaultValue != null) {
            if (instance[property.name] == null) {
                let value = getPropertySpecialValue(cn, property, property.defaultValue);
                if (value != null) instance[property.name] = value;
            }
        } else if (property.number && property.number.autoIncrement && !instance[property.name]) {
            if (property._.sequence == null)
                property._.sequence = await max(cn, (cn["entity"] as mObject).name, property.name) || property.number.seed || 1;
            instance[property.name] = ++property._.sequence;
        } else if (property.properties) {
            let val = {};
            await applyPropertiesDefaultValue(cn, val, property.properties);
            if (!_.isEmpty(val))
                instance[property.name] = val;
        }
    }
}

function getPropertySpecialValue(cn: Context, property: Property, value: string) {
    if (!value || !property.type)
        return value;

    if (property._.isRef) {
        if (value == "_new_")
            return new ObjectId();
        else if (value == "_user_")
            return cn.user ? cn.user._id : null;
    } else if (property.type.toString() === PType.time) {
        switch (value.toLowerCase()) {
            case "_now_": {
                let now = new Date();
                return now;
            }

            case "_today_":
                let now = new Date();
                return new Date(now.getFullYear(), now.getMonth(), now.getDate());

            case "_tomorrow_":
                now = new Date();
                return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        }
    }

    return getPropertyTypedValue(property, value);
}

export function getPageLinks(cn: Context, ref: string) {
    let start = Math.max(2, cn.page - 1);
    let end = Math.min(cn.pages - 1, cn.page + 3);
    let list = [];
    list.push(1);
    if (start == 3)
        list.push(2);
    else if (start > 2)
        list.push(0); // ...

    for (let i = start; i <= end; i++)
        list.push(i);

    if (start < cn.pages - 1 && end < cn.pages - 1)
        list.push(0); // ...

    list.push(cn.pages);
    let result = [];

    let url = Url.parse(ref);
    let search = qs.parse(_.trim(url.search, '?'));
    if (cn.query) search.q = stringify(cn.query, true);

    for (let i = 0; i < list.length; i++) {
        if (list[i] != 1) search.p = list[i].toString();
        if (list[i])
            result.push({
                title: list[i].toString(),
                active: list[i] == cn.page,
                ref: prepareUrl(cn, url.pathname + "?" + qs.stringify(search))
            });
        else
            result.push({
                title: "...",
                ref: "javascript:;"
            });
    }
    return result;
}

function stringifySortUri(sort: any): string {
    let parts = [];
    for (const key in sort) {
        if (sort[key] === 1)
            parts.push(key);
        else
            parts.push("-" + key);
    }
    return parts.join(';');
}

export function prepareUrl(cn: Context, ref: string): string {
    if (!ref) return ref;
    ref = _.trim(ref, "?");
    let separator = ref.indexOf('?') == -1 ? "?" : "&";
    let search = [];
    if (cn.locale !== cn.app.defaultLocale)
        search.push(`${ReqParams.locale}=${Locale[cn.locale]}`);
    if (cn.sort)
        search.push(`${ReqParams.sort}=${stringifySortUri(cn.sort)}`);
    let url = "/" + ref + (search.join("&") ? separator : "") + search.join("&");
    if (cn.prefix)
        url = `/${cn.prefix}${url}`;
    return url;
}

function getPropertyRef(prop: Property, parentRef: string) {
    return parentRef + "/" + prop.name;
}

export async function preparePropertyDeclare(cn: Context, ref: string, prop: Property, instance: any, partial: boolean, parentAccess: AccessAction) {
    if (prop._.ref) return;

    prop._.ref = getPropertyRef(prop, ref);
    // todo: preparePropertyDeclare instance needs to improve
    instance = (cn.res.data ? cn.res.data[prop._.ref] : null) || instance; // when property has subproperty its value already deleted from instance and is put in cn.res.data
    prop.title = $t(cn, prop.title);
    let group = $t(cn, prop.group) || (prop._.gtype == GlobalType.object ? prop.title : $t(cn, "prop-public-group", true));
    prop.group = $t(cn, group);
    if (prop.links && prop.links.length) prop.links = makeLinksReady(cn, ref, instance, prop.links);

    if (prop._.gtype == GlobalType.object)
        await prepareObjectPropertyDeclare(cn, ref, prop, instance, partial, parentAccess);
    else {
        prop.editMode = getPropertyEditMode(cn, prop);
        prop.comment = $t(cn, prop.comment);

        if (prop._.isRef) {
            let items = await getPropertyReferenceValues(cn, prop, instance, null, null);
            if (items) {
                for (const item of items) {
                    (item as any).hover = false; // because of vue-js state
                }
                prop._.items = items;
            } else
                prop._.items = [];
        }
    }
}

function getPropertyEditMode(cn: Context, prop: Property): PropertyEditMode {
    // TODO: complete this
    // if (prop.access) {
    //     let editable = checkAccess(cn, prop.access) & AccessAction.Edit;
    //     if (!editable) return PropertyEditMode.Readonly;
    // }
    return prop.editMode;
}

export function checkAccess(cn: Context, entity: Entity): AccessAction {
    let permissions: Access[] = entity._.permissions;
    let permission = entity.guestAccess || AccessAction.None;
    if (!permissions || !permissions.length) return permission;
    if (!cn.user) return permission;

    for (let access of permissions) {
        if (
            (access.user && cn.user._id.equals(access.user)) ||
            (access.role && cn.user.roles && cn.user.roles.some(r => r.equals(access.role)))
        ) {
            switch (access.permission) {
                case AccessAction.Full:
                    permission = AccessAction.Full;
                    break;

                case AccessAction.View:
                    permission = permission | AccessAction.View;
                    break;

                case AccessAction.Edit:
                    permission = permission | AccessAction.View | AccessAction.Edit;
                    break;

                case AccessAction.NewItem:
                    permission = permission | AccessAction.View | AccessAction.NewItem;
                    break;

                case AccessAction.DeleteItem:
                    permission = permission | AccessAction.View | AccessAction.DeleteItem;
                    break;
            }
        }
    }

    return permission;
}

export function makeLinksReady(cn: Context, ref: string, data: any, links: EntityLink[]): EntityLink[] {
    links = JSON.parse(JSON.stringify(links || []));

    for (let link of links) {
        if (link.condition && !evalExpression(data, link.condition))
            link.disable = true;

        link.title = $t(cn, link.title);
        link.comment = $t(cn, link.comment);

        if (typeof link.address != "string") {
            error(`Link for ref '${ref}' invalid address`);
            link.address = "";
        } else {
            let reg = /\{([\w\.]+)\}/g;
            let result;
            while ((result = reg.exec(link.address)) !== null) {
                if (Array.isArray(data)) {
                    link.disable = true;
                    break;
                }
                let key = result[1];
                switch (key) {
                    case "id":
                        link.address = link.address.replace(/\{id\}/g, data._id);
                        break;

                    case "ref":
                        link.address = link.address.replace(/\{ref\}/g, ref);
                        break;

                    default:
                        let reg = new RegExp(`\{${key}\}`, "g");
                        link.address = link.address.replace(reg, data[key]);
                        break;
                }
            }
        }

        if (!/^http/.test(link.address) && !/^\//.test(link.address))
            link.address = "/" + link.address;
    }
    return links;
}

async function prepareObjectPropertyDeclare(cn: Context, ref: string, prop: Property, instance: any, partial: boolean, parentAccess: AccessAction) {
    if (prop.documentView) return;

    let objectProp = _.cloneDeep(prop) as Property;
    objectProp.properties = objectProp.properties || [];
    if (partial) {
        let propObjectDec = {
            title: prop.title,
            properties: objectProp.properties,
            ref: prop._.ref,
            access: parentAccess,
            reorderable: objectProp.reorderable
        } as ObjectDec;
        if (objectProp.listsViewType) propObjectDec.listsViewType = objectProp.listsViewType;
        if (cn.res.form)
            cn.res.form.declarations[prop._.ref] = propObjectDec;
        else
            warn(`preparePropertyDeclare form is empty for set the declaration for property ${prop.name}`);
    }

    for (const subProp of objectProp.properties) {
        subProp._.ref = null;
        await preparePropertyDeclare(cn, prop._.ref, subProp, instance, partial, parentAccess);
    }

    Object.keys(prop).forEach(k => delete prop[k]);
    prop.name = objectProp.name;
    prop.title = objectProp.title;
    if (!partial)
        prop.properties = objectProp.properties;
    prop.condition = objectProp.condition;
    prop._ = {ref: objectProp._.ref, gtype: objectProp._.gtype};
    prop.isList = objectProp.isList;
    prop.group = objectProp.group || objectProp.title;
    if (prop.isList) prop.referType = objectProp.referType;
    if (objectProp.commentStyle) prop.commentStyle = objectProp.commentStyle;
    if (objectProp.reorderable) prop.reorderable = objectProp.reorderable;
    if (objectProp.listsViewType) prop.listsViewType = objectProp.listsViewType;
    if (objectProp.filter) prop.filter = objectProp.filter;
}

function getPropertyTypedValue(prop: Property, value, ignoreArray?): any {
    if (value === "" && prop.type.toString() != PType.text)
        return null;

    if (value == null || value === "" || !prop.type)
        return value;

    if (prop.isList && !ignoreArray)
        return value.map(item => getPropertyTypedValue(prop, item, true));

    if (prop.type.toString() == PType.file)
        value._fsid = new ObjectId(value._fsid);

    if (typeof value != "string") return value;

    switch (prop.type.toString()) {
        case PType.number:
            if (prop.number && prop.number.float)
                value = parseFloat(value);
            else
                value = parseInt(value);
            if (isNaN(value))
                throw "Invalid format for property " + prop.name;
            return value;

        case PType.boolean:
            return value.toLowerCase() == "true" || value == "1";

        case PType.id:
            return new ObjectId(value);

        case PType.time:
            let date = parseDate(Locale.fa, value);
            if (value && !date)
                throw "Invalid date format for property " + prop.name;
            return date;

        default:
            if (prop._.isRef) {
                if (prop._.enum)
                    return parseInt(value);
                else if (Constants.objectIdRegex.test(value))
                    return new ObjectId(value);
                else
                    return value == "0" ? null : value;
            } else
                return value;
    }
}

export async function sessionSignin(cn: Context, user: User) {
    return new Promise((resolve, reject) => {
        // req.login handles serializing the user id to the session store and inside our request object and also adds the user object to our request object.
        cn["httpReq"].login(user, async (err) => {
            if (err) return reject(err);

            let ip = cn["httpReq"].headers['x-forwarded-for'] || cn["httpReq"].connection.remoteAddress;
            let country = await countryNameLookup(ip);
            await audit(cn, SysAuditTypes.login, {
                user: cn["httpReq"].user._id,
                level: LogType.Info,
                comment: `User '${cn["httpReq"].user.email}' legged-in!\r\nIP:${ip}\r\nCountry:${country}`
            });
            resolve();
        });
    });
}

export function getSigninUrl(cn: Context, back?: string) {
    let url = glob.serviceConfigs[cn.db].sso ? process.env.SSO_SIGNIN_URL : toPublicUrl(cn, Constants.defaultSignInUri, true);
    if (back)
        url += `?back=${encodeURI(back)}`;
    return url;
}

export function toPublicUrl(cn: Context, uri: string, addPrefix: boolean = false): string {
    uri = _.trim(uri, '/');
    if (addPrefix && cn.prefix)
        uri = cn.prefix + "/" + uri;
    return "/" + uri;
}

