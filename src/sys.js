"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionSignin = exports.makeLinksReady = exports.checkAccess = exports.preparePropertyDeclare = exports.prepareUrl = exports.getPageLinks = exports.applyPropertiesDefaultValue = exports.createDeclare = exports.filterAndSortProperties = exports.getPortionProperties = exports.hashPassword = exports.countryLookup = exports.countryNameLookup = exports.sort = exports.execShellCommand = exports.clientNotify = exports.clientAnswerReceived = exports.clientQuestion = exports.removeDir = exports.clientCommand = exports.clientLog = exports.getReference = exports.checkUserRole = exports.getErrorCodeMessage = exports.throwContextError = exports.throwError = exports.isID = exports.runFunction = exports.getUploadedFiles = exports.invoke = exports.mock = exports.getPropertyReferenceValues = exports.makeEntityList = exports.initializeMinaDb = exports.dropDatabase = exports.getAllEntities = exports.getDataEntities = exports.containsPack = exports.getTypes = exports.parseDate = exports.jsonReviver = exports.digitGroup = exports.toQueryString = exports.applyFileQuota = exports.getPathSize = exports.getAllFiles = exports.setIntervalAndExecute = exports.jsonToXml = exports.encodeXml = exports.isRightToLeftLanguage = exports.getEnumByName = exports.getEnum = exports.getEnumItems = exports.getEnumText = exports.sendSms = exports.sendEmail = exports.verifyEmailAccounts = exports.getText = exports.$t = exports.getEntityName = exports.initObject = exports.initProperties = exports.allForms = exports.allFunctions = exports.allObjects = exports.initializeEnums = exports.findObject = exports.findEntity = exports.findEnum = exports.dbConnection = exports.checkPropertyGtype = exports.initializeRoles = exports.initializeRolePermissions = exports.downloadLogFiles = exports.configureLogger = exports.onlyUnique = exports.isRtl = exports.getFullname = exports.fatal = exports.error = exports.warn = exports.info = exports.log = exports.silly = exports.joinUri = exports.movFile = exports.delFile = exports.listDir = exports.putFile = exports.putFileProperty = exports.fileExists = exports.pathExists = exports.getFile = exports.createDir = exports.getAbsolutePath = exports.toAsync = exports.findDrive = exports.getDriveStatus = exports.del = exports.patch = exports.count = exports.portionsToMongoPath = exports.evalExpression = exports.put = exports.getCollection = exports.getOne = exports.getFileUri = exports.makeObjectReady = exports.max = exports.get = exports.getByID = exports.run = exports.audit = exports.newID = exports.markDown = exports.start = exports.reload = exports.glob = void 0;
let index = {
    "Start                                              ": reload,
    "Initialize Entities                                ": initializeEntities,
    "   Initialize Object                               ": initObject,
    "       Initialize Properties                       ": initProperties,
    "get                                                ": get,
    "patch                                              ": patch,
    "put                                                ": put,
};
const qs = require("qs");
const logger = require("winston");
const https = require("https");
const mongodb = require("mongodb");
const _ = require("lodash");
const archiver = require("archiver");
const xmlBuilder = require("xmlbuilder");
const fs = require("fs-extra");
const path = require("path");
const moment = require("moment");
const graphlib = require("graphlib");
const marked = require("marked");
const Jalali = require("jalali-moment");
const sourceMapSupport = require("source-map-support");
const ejs = require("ejs");
const aws = require("aws-sdk");
const rimraf = require("rimraf");
const bson_util_1 = require("bson-util");
const fs_1 = require("fs");
const mongodb_1 = require("mongodb");
const maxmind_1 = require("maxmind");
const universalify_1 = require("universalify");
const Url = require("url");
const types_1 = require("./types");
const nodemailer = require('nodemailer');
const assert = require('assert').strict;
const { exec } = require("child_process");
exports.glob = new types_1.Global();
const fsPromises = fs.promises;
const bcrypt = require('bcrypt');
async function loadHosts() {
    exports.glob.hosts = [];
    let clients = await get({ db: process.env.NODE_NAME }, types_1.Objects.clients);
    let hosts = await get({ db: process.env.NODE_NAME }, types_1.Objects.hosts);
    for (const host of hosts) {
        if (host.client) {
            let client = clients.find(c => c._id.equals(host.client));
            if (!client) {
                error(`Invalid host client, host: '${host.address}'`);
                continue;
            }
            host._ = { db: client.name };
        }
        else
            host._ = { db: process.env.NODE_NAME };
        host.aliases = host.aliases || [];
        if (!host.apps || !host.apps.length)
            continue;
        host._.apps = host.apps.map(ap => exports.glob.apps.find(app => app._id.equals(ap)));
        exports.glob.hosts.push(host);
    }
}
async function reload(cn) {
    let startTime = moment();
    log(`reload ...`);
    exports.glob.suspendService = true;
    await globalCheck();
    await applyAmazonConfig();
    await loadSystemCollections();
    await loadTimeZones();
    await loadAuditTypes();
    await initializeEnums();
    await initializePackages();
    await loadHosts();
    await initializeRoles();
    await initializeEntities();
    await initializeRolePermissions();
    exports.glob.suspendService = false;
    let period = moment().diff(startTime, 'ms', true);
    info(`reload done in '${period}' ms.`);
}
exports.reload = reload;
async function start() {
    try {
        process.on('uncaughtException', async (err) => await audit({ db: types_1.Constants.sysDb }, types_1.SysAuditTypes.uncaughtException, {
            level: types_1.LogType.Fatal,
            comment: err.message + ". " + err.stack
        }));
        process.on('unhandledRejection', async (err) => {
            await audit({ db: types_1.Constants.sysDb }, types_1.SysAuditTypes.unhandledRejection, {
                level: types_1.LogType.Fatal,
                comment: typeof err == "number" ? err.toString() : err.message + ". " + err.stack
            });
        });
        sourceMapSupport.install({ handleUncaughtExceptions: true });
        configureLogger(false);
        await reload();
        return exports.glob;
    }
    catch (ex) {
        error("sys.main error:", ex.stack || ex.message || ex);
        return null;
    }
}
exports.start = start;
function markDown(text) {
    return marked(text);
}
exports.markDown = markDown;
function isWindows() {
    return /^win/.test(process.platform);
}
function newID(id) {
    return new mongodb_1.ObjectId(id);
}
exports.newID = newID;
async function audit(cn, auditType, args) {
    try {
        args.type = args.type || newID(auditType);
        args.time = new Date();
        let comment = args.comment || "";
        let type = exports.glob.auditTypes.find(type => type._id.equals(args.type));
        let msg = "audit(" + (type ? type.name : args.type) + "): " + comment;
        switch (args.level) {
            case types_1.LogType.Fatal:
                fatal(msg);
                break;
            case types_1.LogType.Error:
                error(msg);
                break;
            case types_1.LogType.Info:
                info(msg);
                break;
            case types_1.LogType.Warning:
                warn(msg);
                break;
        }
        if (type && type.disabled)
            return;
        await put(cn, types_1.Objects.audits, args);
    }
    catch (e) {
        error(`Audit '${auditType}' error: ${e.stack}`);
    }
}
exports.audit = audit;
function run(cn, func, ...args) {
    try {
        let theFunction = eval(_.camelCase(func));
        theFunction(cn, ...args);
    }
    catch (err) {
        warn(`[exe] ${func}`);
    }
}
exports.run = run;
async function getByID(cn, objectName, id) {
    if (!id)
        return null;
    return get(cn, objectName, { itemId: id });
}
exports.getByID = getByID;
async function get(cn, objectName, options) {
    let collection = await getCollection(cn, objectName);
    options = options || {};
    let result;
    if (options.itemId)
        result = await collection.findOne(options.itemId);
    else {
        let find = collection.find(options.query);
        if (options.sort)
            find = find.sort(options.sort);
        if (options.last)
            find = find.sort({ $natural: -1 });
        if (options.count)
            find = find.limit(options.count);
        if (options.skip)
            find = await find.skip(options.skip);
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
exports.get = get;
async function max(cn, objectName, property) {
    let collection = await getCollection(cn, objectName);
    let sort = {};
    sort[property] = -1;
    let maxDoc = await collection.find().sort(sort).limit(1).toArray();
    if (!maxDoc || maxDoc.length == 0)
        return null;
    return maxDoc[0][property];
}
exports.max = max;
async function makeObjectReady(cn, properties, data, options = null) {
    if (!data)
        return;
    data = Array.isArray(data) ? data : [data];
    for (const item of data) {
        for (const prop of properties) {
            let val = item[prop.name];
            if (!val || !prop._)
                continue;
            if (prop._.isRef && !prop._.enum && prop.viewMode != types_1.PropertyViewMode.Hidden && isID(val)) {
                let refObj = findEntity(prop.type);
                if (!refObj)
                    throwError(types_1.StatusCode.UnprocessableEntity, `referred object for property '${cn.db}.${prop.name}' not found!`);
                if (refObj.entityType == types_1.EntityType.Object) {
                    item._ = item._ || {};
                    item._[prop.name] = await get(cn, refObj.name, { itemId: val });
                }
                else if (refObj.entityType == types_1.EntityType.Function) {
                }
            }
            switch (prop._.gtype) {
                case types_1.GlobalType.file:
                    val._ = { uri: getFileUri(cn, prop, val) };
                    break;
            }
            if (prop.properties)
                await makeObjectReady(cn, prop.properties, val, options);
        }
    }
}
exports.makeObjectReady = makeObjectReady;
function getFileUri(cn, prop, file) {
    if (!file || !prop.file || !prop.file.drive)
        return null;
    let drive = exports.glob.drives.find(d => d._id.equals(prop.file.drive));
    let uri = joinUri(drive._.uri, file.path, file.name).replace(/\\/g, '/');
    return `${cn.url ? cn.url.protocol : 'http:'}//${encodeURI(uri)}`;
}
exports.getFileUri = getFileUri;
async function getOne(cn, objectName) {
    return get(cn, objectName, { count: 1 });
}
exports.getOne = getOne;
async function getCollection(cn, objectName) {
    let db = await dbConnection(cn);
    return db.collection(objectName);
}
exports.getCollection = getCollection;
async function put(cn, objectName, data, options) {
    let collection = await getCollection(cn, objectName);
    data = data || {};
    if (!options || !options.portions || options.portions.length == 1) {
        if (Array.isArray(data)) {
            await collection.insertMany(data);
            return {
                type: types_1.ObjectModifyType.Insert,
                items: data
            };
        }
        else if (data._id && data._new) {
            delete data._new;
            await collection.insertOne(data);
            return {
                type: types_1.ObjectModifyType.Insert,
                item: data,
                itemId: data._id
            };
        }
        else if (data._id) {
            await collection.replaceOne({ _id: data._id }, data);
            return {
                type: types_1.ObjectModifyType.Update,
                item: data,
                itemId: data._id
            };
        }
        else {
            await collection.insertOne(data);
            return {
                type: types_1.ObjectModifyType.Insert,
                item: data,
                itemId: data._id
            };
        }
    }
    let portions = options.portions;
    switch (portions.length) {
        case 2:
            await collection.save(data);
            return ({
                type: types_1.ObjectModifyType.Update,
                item: data,
                itemId: data._id
            });
        default:
            let command = { $addToSet: {} };
            assert(data._id, `_id expected for inserting!`);
            delete data._new;
            let rootId = portions[1].itemId;
            let pth = await portionsToMongoPath(cn, rootId, portions, portions.length);
            command.$addToSet[pth] = data;
            await collection.updateOne({ _id: rootId }, command);
            return {
                type: types_1.ObjectModifyType.Patch,
                item: data,
                itemId: rootId
            };
    }
}
exports.put = put;
function evalExpression($this, expression) {
    try {
        if (!expression)
            return expression;
        return eval(expression.replace(/\bthis\b/g, '$this'));
    }
    catch (ex) {
        error(`Evaluating '${expression}' failed! this:` + ex.message);
    }
}
exports.evalExpression = evalExpression;
async function portionsToMongoPath(cn, rootId, portions, endIndex) {
    if (endIndex == 3)
        return portions[2].property.name;
    let db = await dbConnection(cn);
    let collection = db.collection(portions[0].value);
    if (!collection)
        throw types_1.StatusCode.BadRequest;
    let value = await collection.findOne({ _id: rootId });
    if (!value)
        throw types_1.StatusCode.ServerError;
    let path = "";
    for (let i = 2; i < endIndex; i++) {
        let part = portions[i].value;
        if (portions[i].type == types_1.RefPortionType.property) {
            path += "." + part;
            value = value[part];
            if (value == null)
                value = {};
        }
        else {
            let partItem = value.find(it => it._id && it._id.toString() == part);
            if (!partItem)
                throw types_1.StatusCode.ServerError;
            path += "." + value.indexOf(partItem);
            value = partItem;
        }
    }
    return path.replace(/^\.+|\.+$/, '');
}
exports.portionsToMongoPath = portionsToMongoPath;
async function count(cn, objectName, options) {
    let collection = await getCollection(cn, objectName);
    options = options || {};
    let query = options.query || {};
    return await collection.countDocuments(query, null);
}
exports.count = count;
async function patch(cn, objectName, patchData, options) {
    let db = await dbConnection(cn);
    let collection = db.collection(objectName);
    if (!collection)
        throw types_1.StatusCode.BadRequest;
    if (options && options.filter && !options.portions) {
        let command = {};
        for (let key in patchData) {
            if (patchData[key] == null) {
                command.$unset = command.$unset || {};
                command.$unset[key] = "";
            }
            else {
                command.$set = command.$set || {};
                command.$set[key] = patchData[key];
            }
        }
        let result = await collection.updateOne(options.filter, command);
        return {
            type: types_1.ObjectModifyType.Patch,
        };
    }
    if (!options)
        options = { portions: [] };
    let portions = options.portions;
    if (!portions.length)
        portions = [{ type: types_1.RefPortionType.entity, value: objectName }];
    if (portions.length < 2)
        assert(patchData._id, `_id is expected in patch data.`);
    if (portions.length == 1) {
        portions.push({
            type: types_1.RefPortionType.item,
            value: patchData._id.toString(),
            itemId: patchData._id
        });
    }
    let theRootId = portions.length < 2 ? patchData._id : portions[1].itemId;
    let path = await portionsToMongoPath(cn, theRootId, portions, portions.length);
    let command = { $set: {}, $unset: {} };
    if (portions[portions.length - 1].property && portions[portions.length - 1].property._.gtype == types_1.GlobalType.file)
        command["$set"][path] = patchData;
    else
        for (const key in patchData) {
            if (key == "_id")
                continue;
            command[patchData[key] == null ? "$unset" : "$set"][path + (path ? "." : "") + key] = patchData[key];
        }
    if (_.isEmpty(command.$unset))
        delete command.$unset;
    if (_.isEmpty(command.$set))
        delete command.$set;
    let rootId = portions[1].itemId;
    let filter = (options && options.filter) ? options.filter : { _id: rootId };
    let result = await collection.updateOne(filter, command);
    return {
        type: types_1.ObjectModifyType.Patch,
        item: patchData,
        itemId: rootId
    };
}
exports.patch = patch;
async function del(cn, objectName, options) {
    let db = await dbConnection(cn);
    let collection = db.collection(objectName);
    if (!collection)
        throw types_1.StatusCode.BadRequest;
    if (!options) {
        await collection.deleteMany({});
        return { type: types_1.ObjectModifyType.Delete };
    }
    if (options.query) {
        await collection.deleteMany(options.query);
        return { type: types_1.ObjectModifyType.Delete };
    }
    if (options.itemId) {
        let result = await collection.deleteOne({ _id: options.itemId });
        return {
            type: types_1.ObjectModifyType.Delete,
            item: null,
            itemId: options.itemId
        };
    }
    let portions = options.portions;
    if (portions.length == 1 || portions.length == 3)
        throw types_1.StatusCode.BadRequest;
    switch (portions.length) {
        case 2:
            await collection.deleteOne({ _id: portions[1].itemId });
            return {
                type: types_1.ObjectModifyType.Delete,
                item: null,
                itemId: portions[1].itemId
            };
        default:
            let command = { $pull: {} };
            let rootId = portions[1].itemId;
            let itemId = portions[portions.length - 1].itemId;
            let path = await portionsToMongoPath(cn, rootId, portions, portions.length - 1);
            command.$pull[path] = { _id: itemId };
            await collection.updateOne({ _id: rootId }, command);
            return {
                type: types_1.ObjectModifyType.Patch,
                item: null,
                itemId: rootId
            };
    }
}
exports.del = del;
async function getDriveStatus(drive) {
    switch (drive.type) {
        case types_1.SourceType.File:
            try {
                await fs.access(drive.address);
            }
            catch (err) {
                if (err.code == "ENOENT") {
                    await createDir(drive, drive.address);
                }
                else
                    throw err;
            }
            break;
        default:
            throwError(types_1.StatusCode.NotImplemented);
    }
}
exports.getDriveStatus = getDriveStatus;
function findDrive(cn, driveName) {
    return exports.glob.drives.find(drive => drive._.db == cn.db && drive.title == driveName);
}
exports.findDrive = findDrive;
function toAsync(fn) {
    return universalify_1.fromCallback(fn);
}
exports.toAsync = toAsync;
function getAbsolutePath(...paths) {
    if (!paths || paths.length == 0)
        return exports.glob.rootDir;
    let result = /^\./.test(paths[0]) ? path.join(exports.glob.rootDir, ...paths) : path.join(...paths);
    return result;
}
exports.getAbsolutePath = getAbsolutePath;
async function createDir(drive, dir, recursive = true) {
    switch (drive.type) {
        case types_1.SourceType.File:
            await fs.mkdir(getAbsolutePath(dir), { recursive });
            break;
        default:
            throwError(types_1.StatusCode.NotImplemented);
    }
}
exports.createDir = createDir;
async function getFile(drive, filePath) {
    switch (drive.type) {
        case types_1.SourceType.File:
            let _path = path.join(getAbsolutePath(drive.address), filePath);
            return await fs.readFile(_path);
        case types_1.SourceType.Db:
            let db = await dbConnection({ db: drive._.db });
            let bucket = new mongodb.GridFSBucket(db);
            let stream = bucket.openDownloadStreamByName(filePath);
            let data;
            return new Promise((resolve, reject) => {
                stream.on("end", function () {
                    resolve(data);
                }).on("data", function (chunk) {
                    data = data ? Buffer.concat([data, chunk]) : chunk;
                }).on("error", function (err) {
                    reject(err);
                });
            });
        default:
            throw types_1.StatusCode.NotImplemented;
    }
}
exports.getFile = getFile;
async function pathExists(path) {
    return await new Promise(resolve => fs.access(path, fs.constants.F_OK, err => resolve(!err)));
}
exports.pathExists = pathExists;
async function fileExists(filePath, drive) {
    if (!drive)
        return pathExists(filePath);
    switch (drive.type) {
        case types_1.SourceType.File:
            let _path = path.join(getAbsolutePath(drive.address), filePath);
            return await pathExists(_path);
        case types_1.SourceType.Db:
            throw types_1.StatusCode.NotImplemented;
        default:
            throw types_1.StatusCode.NotImplemented;
    }
}
exports.fileExists = fileExists;
async function putFileProperty(cn, objectName, item, propertyName, fileName, buffer) {
    if (!buffer || !buffer.length)
        return;
    let obj = findObject(cn, objectName);
    assert(obj, `putFileProperty Invalid objectName: ${objectName}`);
    let property = obj.properties.find(p => p.name == propertyName);
    assert(property, `putFileProperty Invalid property: '${objectName}.${propertyName}'`);
    assert(property.file && property.file.drive, `putFileProperty Property: '${propertyName}' should have file config`);
    let drive = exports.glob.drives.find(d => d._id.equals(property.file.drive));
    let relativePath = joinUri(property.file.path, fileName);
    await putFile(drive, relativePath, buffer);
    let file = { name: fileName, size: buffer.length, path: property.file.path };
    let patchData = {};
    patchData[propertyName] = file;
    await patch(cn, objectName, patchData, { filter: { _id: item._id } });
    file._ = { uri: getFileUri(cn, property, file) };
    item[propertyName] = file;
}
exports.putFileProperty = putFileProperty;
async function putFile(drive, relativePath, file) {
    switch (drive.type) {
        case types_1.SourceType.File:
            let _path = path.join(getAbsolutePath(drive.address), relativePath);
            await fs.mkdir(path.dirname(_path), { recursive: true });
            await fs.writeFile(_path, file);
            break;
        case types_1.SourceType.Db:
            let db = await dbConnection({ db: drive._.db });
            let bucket = new mongodb.GridFSBucket(db);
            let stream = bucket.openUploadStream(relativePath);
            await delFile(drive._.db, drive, relativePath);
            stream.on("error", function (err) {
                error("putFile error", err);
            }).end(file);
            break;
        case types_1.SourceType.S3:
            try {
                let s3 = new aws.S3({ apiVersion: types_1.Constants.amazonS3ApiVersion, region: process.env.AWS_S3_REGION });
                const config = {
                    Bucket: drive.address,
                    Key: relativePath,
                    Body: file,
                    ACL: "public-read"
                };
                return await s3.upload(config).promise();
            }
            catch (ex) {
                error(`putFile error, drive: ${drive.title}`, ex);
                throwError(types_1.StatusCode.ConfigurationProblem, `Could not save the file due to a problem.`);
            }
            break;
        default:
            throw types_1.StatusCode.NotImplemented;
    }
}
exports.putFile = putFile;
async function listDir(drive, dir) {
    switch (drive.type) {
        case types_1.SourceType.File:
            let addr = path.join(getAbsolutePath(drive.address), dir || "");
            let list = await fsPromises.readdir(addr, { withFileTypes: true });
            let files = list.map(item => {
                return { name: item.name, type: item.isDirectory() ? types_1.DirFileType.Folder : types_1.DirFileType.File };
            });
            for (const file of files) {
                if (file.type == types_1.DirFileType.File) {
                    let stat = await fsPromises.stat(path.join(addr, file.name));
                    file.size = stat.size;
                }
            }
            return files;
        default:
            throw types_1.StatusCode.NotImplemented;
        case types_1.SourceType.S3:
            let s3 = new aws.S3({ apiVersion: types_1.Constants.amazonS3ApiVersion });
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
                    }
                    else {
                        let folders = data.CommonPrefixes.map(item => {
                            return {
                                name: _.trim(item.Prefix.replace(regex, ""), '/'),
                                type: types_1.DirFileType.Folder
                            };
                        });
                        let files = data.Contents.map(item => {
                            return {
                                name: _.trim(item.Key.replace(regex, ""), '/'),
                                type: types_1.DirFileType.File,
                                size: item.Size
                            };
                        });
                        resolve(folders.concat(files).filter(item => item.name));
                    }
                });
            });
    }
}
exports.listDir = listDir;
async function delFile(pack, drive, relativePath) {
    switch (drive.type) {
        case types_1.SourceType.File:
            let _path = path.join(getAbsolutePath(drive.address), relativePath);
            await fs.unlink(_path);
            break;
        case types_1.SourceType.S3:
            let s3 = new aws.S3({ apiVersion: types_1.Constants.amazonS3ApiVersion });
            let data = await s3.deleteObject({ Bucket: drive.address, Key: relativePath });
            break;
        case types_1.SourceType.Db:
            break;
        default:
            throw types_1.StatusCode.NotImplemented;
    }
}
exports.delFile = delFile;
async function movFile(pack, sourcePath, targetPath) {
}
exports.movFile = movFile;
function joinUri(...parts) {
    let uri = "";
    for (const part of parts) {
        if (part)
            uri += "/" + part.replace(/^\//, '').replace(/\/$/, '');
    }
    return uri.substr(1);
}
exports.joinUri = joinUri;
function silly(...message) {
    logger.silly(message);
}
exports.silly = silly;
function log(...message) {
    logger.debug(message);
}
exports.log = log;
function info(...message) {
    logger.info(message);
}
exports.info = info;
function warn(...message) {
    logger.warn(message);
}
exports.warn = warn;
function error(message, err) {
    logger.error(err ? message + "," + err : message);
}
exports.error = error;
function fatal(message) {
    logger.log('fatal', message);
}
exports.fatal = fatal;
function getFullname(pack, name) {
    if (!name)
        name = "";
    if (name.indexOf('.') === -1)
        name = pack + "." + name;
    return name;
}
exports.getFullname = getFullname;
function isRtl(lang) {
    if (!lang)
        return null;
    return lang === types_1.Locale.fa || lang === types_1.Locale.ar;
}
exports.isRtl = isRtl;
async function loadTimeZones() {
    log('loadGeneralCollections ...');
    exports.glob.timeZones = await get({ db: types_1.Constants.sysDb }, types_1.Constants.timeZonesCollection);
    let result = await get({ db: types_1.Constants.sysDb }, types_1.Objects.objects, {
        query: { name: types_1.Constants.systemPropertiesObjectName },
        count: 1
    });
    let countries = await get({ db: types_1.Constants.sysDb }, types_1.Objects.countries);
    for (const country of countries) {
        exports.glob.countries[country.code] = country;
    }
    if (!result) {
        logger.error("loadGeneralCollections failed terminating process ...");
        process.exit();
    }
    exports.glob.systemProperties = result ? result.properties : [];
}
async function loadAuditTypes() {
    log('loadAuditTypes ...');
    exports.glob.auditTypes = await get({ db: types_1.Constants.sysDb }, types_1.Objects.auditTypes);
}
async function globalCheck() {
    assert(process.env.DB_ADDRESS, "Environment variable 'DB_ADDRESS' is needed.");
    assert(process.env.NODE_NAME, "Environment variable 'NODE_NAME' is needed.");
    try {
        await mongodb_1.MongoClient.connect(process.env.DB_ADDRESS, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            poolSize: types_1.Constants.mongodbPoolSize
        });
    }
    catch (ex) {
        fatal("Error connecting to the database: " + ex.message);
    }
}
function applyAmazonConfig() {
    aws.config.accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    aws.config.secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
}
async function loadPackageSystemCollections(db) {
    log(`Loading system collections db '${db}' ...`);
    let cn = { db };
    let objects = await get(cn, types_1.Objects.objects);
    for (const object of objects) {
        object._ = { db };
        object.entityType = types_1.EntityType.Object;
        exports.glob.entities.push(object);
    }
    let functions = await get(cn, types_1.Objects.functions);
    for (const func of functions) {
        func._ = { db };
        func.entityType = types_1.EntityType.Function;
        exports.glob.entities.push(func);
    }
    let config = await getOne(cn, types_1.Objects.clientConfig);
    if (config)
        exports.glob.clientConfig[db] = config;
    let apps = await get(cn, types_1.Objects.apps);
    for (const app of apps) {
        app._ = { db };
        exports.glob.apps.push(app);
    }
    let forms = await get(cn, types_1.Objects.forms);
    for (const form of forms) {
        form._ = { db };
        form.entityType = types_1.EntityType.Form;
        exports.glob.entities.push(form);
    }
    let texts = await get(cn, types_1.Objects.dictionary);
    for (const item of texts) {
        exports.glob.dictionary[db + "." + item.name] = item.text;
    }
    let menus = await get(cn, types_1.Objects.menus);
    for (const menu of menus) {
        menu._ = { db };
        exports.glob.menus.push(menu);
    }
    let roles = await get(cn, types_1.Objects.roles);
    for (const role of roles) {
        role._ = { db };
        exports.glob.roles.push(role);
    }
    let drives = await get(cn, types_1.Objects.drives);
    for (const drive of drives) {
        drive._ = { db };
        exports.glob.drives.push(drive);
    }
}
function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
}
exports.onlyUnique = onlyUnique;
async function loadSystemCollections() {
    exports.glob.entities = [];
    exports.glob.dictionary = {};
    exports.glob.menus = [];
    exports.glob.roles = [];
    exports.glob.drives = [];
    exports.glob.apps = [];
    exports.glob.services = {};
    let services = await get({ db: process.env.NODE_NAME }, types_1.Objects.services, { query: { enabled: true } });
    services.forEach(service => exports.glob.services[service.name] = {});
    exports.glob.clients = await get({ db: process.env.NODE_NAME }, types_1.Objects.clients);
    for (let client of exports.glob.clients) {
        client._ = { db: client.name || ("c" + client.code) };
    }
    exports.glob.dbsList = [...Object.keys(exports.glob.services), ...exports.glob.clients.map(cl => cl.name)];
    for (const db of exports.glob.dbsList) {
        try {
            exports.glob.dbs[db] = null;
            await loadPackageSystemCollections(db);
        }
        catch (err) {
            error("loadSystemCollections", err);
        }
    }
}
function configureLogger(silent) {
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
    let transports = [
        new logger.transports.File({
            filename: path.join(logDir, types_1.Constants.ErrorLogFile),
            level: 'error',
            format: logger.format.printf(info => `${moment().format('DD-HH:mm:ss.SS')}  ${info.level}\t${info.message}`),
        }),
        new logger.transports.File({
            filename: path.join(logDir, types_1.Constants.InfoLogFile),
            level: 'debug',
            format: logger.format.printf(info => `${moment().format('DD-HH:mm:ss.SS')}  ${info.level}\t${info.message}`),
        })
    ];
    if (!silent)
        transports.unshift(new logger.transports.Console({
            level: 'silly', format: logger.format.combine(logger.format.simple(), logger.format.printf(msg => logger.format.colorize().colorize(msg.level, "" + msg.message)))
        }));
    logger.configure({ levels: logLevels.levels, exitOnError: false, transports });
    logger.addColors(logLevels.colors);
}
exports.configureLogger = configureLogger;
async function downloadLogFiles(cn) {
    let logDir = getAbsolutePath('./logs');
    let fileName = `log-files-${Math.ceil(Math.random() * 10000000)}.zip`;
    let tempPath = getAbsolutePath('./drive-default/temp');
    try {
        await fs_1.promises.mkdir(tempPath);
    }
    catch (e) {
    }
    let stream = fs.createWriteStream(path.join(tempPath, fileName));
    let archive = archiver('zip', {
        zlib: { level: 9 }
    });
    archive.directory(logDir, false);
    archive.finalize();
    await new Promise(resolve => archive.pipe(stream).on("finish", resolve));
    cn.res = cn.res || {};
    cn.res.redirect = `/@default/temp/${fileName}`;
}
exports.downloadLogFiles = downloadLogFiles;
function initializeRolePermissions(justEntity) {
    for (const role of exports.glob.roles) {
        if (!role.permissions)
            continue;
        for (let permit of role.permissions) {
            let entity = findEntity(permit.obj || permit.func || permit.form);
            if (!entity || (justEntity && !justEntity.equals(entity._id)))
                continue;
            entity._.permissions = entity._.permissions || [];
            let permission = (permit.objAction || permit.funcAction || permit.formAction);
            entity._.permissions.push({ role: role._id, permission });
        }
    }
}
exports.initializeRolePermissions = initializeRolePermissions;
function initializeRoles() {
    let g = new graphlib.Graph();
    for (const role of exports.glob.roles) {
        g.setNode(role._id.toString());
        for (const subRole of role.roles || []) {
            g.setEdge(role._id.toString(), subRole.toString());
        }
    }
    for (const role of exports.glob.roles) {
        let result = graphlib.alg.postorder(g, role._id.toString());
        role.roles = result.map(item => newID(item));
    }
}
exports.initializeRoles = initializeRoles;
function templateRender(pack, template) {
    try {
        let render = ejs.compile(template);
        return render;
    }
    catch (err) {
        error(`templateRender error for pack '${pack}': `, err.stack);
        return null;
    }
}
function initializePackages() {
    log(`initializePackages`);
    let sysTemplateRender = templateRender(types_1.Constants.sysDb, types_1.Constants.DEFAULT_APP_TEMPLATE);
    for (const app of exports.glob.apps) {
        app.dependencies = app.dependencies || [];
        app.dependencies.push(types_1.Constants.sysDb);
        if (app.template)
            app._.templateRender = templateRender(app._.db, app.template);
        else
            app._.templateRender = sysTemplateRender;
        if (app.menu)
            app._.menu = exports.glob.menus.find(menu => menu._id.equals(app.menu));
    }
}
function checkPropertyGtype(prop, entity, parentProperty = null) {
    if (!prop.type) {
        if (prop.properties && prop.properties.length) {
            prop._.gtype = types_1.GlobalType.object;
            return;
        }
        else {
            if (!parentProperty || (parentProperty.referType != types_1.PropertyReferType.inlineData))
                warn(`property '${entity._.db}.${entity.name}.${prop.name}' type is empty!`);
            return;
        }
    }
    switch (prop.type.toString()) {
        case types_1.PType.boolean:
            prop._.gtype = types_1.GlobalType.boolean;
            return;
        case types_1.PType.text:
            prop._.gtype = types_1.GlobalType.string;
            if (prop.properties)
                delete prop.properties;
            return;
        case types_1.PType.number:
            prop._.gtype = types_1.GlobalType.number;
            return;
        case types_1.PType.location:
            prop._.gtype = types_1.GlobalType.location;
            return;
        case types_1.PType.time:
            prop._.gtype = types_1.GlobalType.time;
            return;
        case types_1.PType.file:
            prop._.gtype = types_1.GlobalType.file;
            return;
        case types_1.PType.id:
            prop._.gtype = types_1.GlobalType.object;
            return;
        case types_1.PType.obj:
            prop._.gtype = types_1.GlobalType.object;
            prop.documentView = true;
            return;
    }
    prop._.isRef = true;
    prop._.enum = findEnum(prop.type);
    if (prop._.enum) {
        prop._.gtype = types_1.GlobalType.number;
        return;
    }
    let type = findEntity(prop.type);
    if (type == null) {
        prop._.gtype = types_1.GlobalType.unknown;
        warn(`Property '${prop.name}' invalid type '${prop.type}' not found. entity: ${entity.name}!`);
        return;
    }
    if (type.entityType == types_1.EntityType.Function) {
        let func = type;
        if (func.returnType && func.returnType.toString() == types_1.PType.text)
            prop._.gtype = types_1.GlobalType.string;
        else
            prop._.gtype = types_1.GlobalType.id;
    }
    else {
        let refType = prop.referType;
        if (!refType)
            refType = prop.type ? types_1.PropertyReferType.select : types_1.PropertyReferType.inlineData;
        switch (refType) {
            case types_1.PropertyReferType.select:
                prop._.gtype = types_1.GlobalType.id;
                break;
            case types_1.PropertyReferType.inlineData:
                prop._.isRef = false;
                prop._.gtype = types_1.GlobalType.object;
                break;
        }
    }
}
exports.checkPropertyGtype = checkPropertyGtype;
async function dbConnection(cn, connectionString) {
    let key = cn.db + ":" + connectionString;
    if (exports.glob.dbs[key])
        return exports.glob.dbs[key];
    connectionString = connectionString || process.env.DB_ADDRESS;
    if (!connectionString)
        throw ("Environment variable 'DB_ADDRESS' is needed.");
    try {
        let dbc = await mongodb_1.MongoClient.connect(connectionString, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            poolSize: types_1.Constants.mongodbPoolSize
        });
        if (!dbc)
            return null;
        return exports.glob.dbs[key] = dbc.db(cn.db);
    }
    catch (e) {
        error(e.stack);
        error(`db '${cn.db}' connection failed [${connectionString}]`);
        throw `connecting to db '${cn.db}' failed`;
    }
}
exports.dbConnection = dbConnection;
function findEnum(type) {
    if (!type)
        return null;
    return exports.glob.enums.find(enm => enm._id.equals(type));
}
exports.findEnum = findEnum;
function findEntity(id) {
    if (!id)
        return null;
    return exports.glob.entities.find(a => a._id.equals(id));
}
exports.findEntity = findEntity;
function findObject(db, objectName) {
    if (typeof db != "string")
        db = db.db;
    return exports.glob.entities.find(a => a._.db == db && a.name == objectName && a.entityType == types_1.EntityType.Object);
}
exports.findObject = findObject;
async function initializeEnums() {
    log('initializeEnums ...');
    exports.glob.enums = [];
    exports.glob.enumTexts = {};
    for (const db of exports.glob.dbsList) {
        let enums = await get({ db }, types_1.Objects.enums);
        for (const theEnum of enums) {
            theEnum._ = { db };
            exports.glob.enums.push(theEnum);
            let texts = {};
            _.sortBy(theEnum.items, types_1.Constants.indexProperty).forEach(item => texts[item.value] = item.title || item.name);
            exports.glob.enumTexts[db + "." + theEnum.name] = texts;
        }
    }
}
exports.initializeEnums = initializeEnums;
function allObjects(cn) {
    let ss = exports.glob.entities.filter(en => !en._);
    return exports.glob.entities.filter(en => en.entityType == types_1.EntityType.Object && (!cn || containsPack(cn, en._.db)));
}
exports.allObjects = allObjects;
function allFunctions(cn) {
    return exports.glob.entities.filter(en => en.entityType == types_1.EntityType.Function && (!cn || containsPack(cn, en._.db)));
}
exports.allFunctions = allFunctions;
function allForms(cn) {
    return exports.glob.entities.filter(en => en.entityType == types_1.EntityType.Form && (!cn || containsPack(cn, en._.db)));
}
exports.allForms = allForms;
async function initializeEntities() {
    log(`Initializing '${allObjects(null).length}' Objects ...`);
    let allObjs = allObjects(null);
    for (const obj of allObjs) {
        obj._.inited = false;
    }
    for (const obj of allObjs) {
        await initObject(obj);
    }
    for (const client of exports.glob.clients) {
        let config = exports.glob.clientConfig[client._.db];
        let obj = findObject(client._.db, types_1.Objects.clientConfig);
        if (!obj) {
            error(`clientConfig for client '${client.code}' not found!`);
            continue;
        }
        await makeObjectReady({ db: "c" + client.code }, obj.properties, config);
    }
    log(`Initializing '${allFunctions(null).length}' functions ...`);
    for (const func of allFunctions(null)) {
        try {
            func.pack = func.pack || exports.glob.services[func._.db].defaultPackage;
            assert(func.pack, `Function needs unknown pack, or default pack in PackageConfig needed!`);
            await initProperties(func.properties, func, func.title, null);
        }
        catch (ex) {
            error("Init functions, Module: " + func._.db + ", Action: " + func.name, ex);
        }
    }
}
function checkFileProperty(prop, entity) {
    if (prop._.gtype == types_1.GlobalType.file) {
        if (prop.file && prop.file.drive) {
            let drive = exports.glob.drives.find(d => d._id.equals(prop.file.drive));
            if (!drive)
                error(`drive for property file '${entity._.db}.${entity.name}.${prop.name}' not found.`);
            else
                prop._.fileUri = drive._.uri;
        }
        else if (entity.entityType == types_1.EntityType.Object)
            error(`drive for property file '${entity._.db}.${entity.name}.${prop.name}' must be set.`);
    }
}
function checkForSystemProperty(prop) {
    if (!prop.type && !prop.properties) {
        let sysProperty = exports.glob.systemProperties.find(p => p.name === prop.name);
        if (sysProperty)
            _.defaultsDeep(prop, sysProperty);
    }
}
function initProperties(properties, entity, parentTitle, parentProperty) {
    if (!properties)
        return;
    for (const prop of properties) {
        prop._ = {};
        checkForSystemProperty(prop);
        prop.group = prop.group || parentTitle;
        checkPropertyGtype(prop, entity, parentProperty);
        checkFileProperty(prop, entity);
        if (prop.number && prop.number.autoIncrement)
            prop.editMode = types_1.PropertyEditMode.Readonly;
        initProperties(prop.properties, entity, prop.title, prop);
    }
}
exports.initProperties = initProperties;
function initObject(obj) {
    try {
        if (obj._.inited)
            return;
        else
            obj._.inited = true;
        obj.properties = obj.properties || [];
        obj._.autoSetInsertTime = _.some(obj.properties, { name: types_1.SystemProperty.time });
        obj._.filterObject = findEntity(obj.filterObject);
        initProperties(obj.properties, obj, null, null);
        if (obj.reference) {
            let referenceObj = findEntity(obj.reference);
            if (!referenceObj)
                return warn(`SimilarObject in service '${obj._.db}' not found for object: '${obj.title}', SimilarReference:${obj.reference}`);
            initObject(referenceObj);
            applyAttrsFromReferencedObject(obj, referenceObj);
            compareParentProperties(obj.properties, referenceObj.properties, obj);
        }
        else if (obj.properties) {
            for (const prop of obj.properties) {
                checkPropertyReference(prop, obj);
            }
        }
    }
    catch (ex) {
        error(`initObject, Error in object ${obj._.db}.${obj.name}`, ex);
    }
}
exports.initObject = initObject;
function applyAttrsFromReferencedObject(obj, referenceObj) {
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
function checkPropertyReference(property, entity) {
    if (property._.gtype == types_1.GlobalType.object && (!property.properties || !property.properties.length)) {
        let propertyParentObject = findEntity(property.type);
        if (!propertyParentObject) {
            if (property._.gtype == types_1.GlobalType.object)
                return;
            return error(`Property '${entity._.db}.${entity.name}.${property.name}' type '${property.type}' not found.`);
        }
        initObject(propertyParentObject);
        property.properties = property.properties || [];
        if (!property._.parentPropertiesCompared) {
            property._.parentPropertiesCompared = true;
            compareParentProperties(property.properties, propertyParentObject.properties, entity);
        }
    }
    else if (property.properties)
        for (const prop of property.properties) {
            checkPropertyReference(prop, entity);
        }
}
function compareParentProperties(properties, parentProperties, entity) {
    if (!parentProperties)
        return;
    let parentNames = parentProperties.map(p => p.name);
    for (let newProperty of properties.filter(p => parentNames.indexOf(p.name) == -1)) {
        checkPropertyReference(newProperty, entity);
    }
    for (const parentProperty of parentProperties) {
        let property = properties.find(p => p.name === parentProperty.name);
        if (!property) {
            properties.push(parentProperty);
            continue;
        }
        _.defaultsDeep(property, parentProperty);
        if (property.referType == types_1.PropertyReferType.inlineData && property.type) {
            try {
                let propertyParentObject = findEntity(property.type);
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
            }
            catch (ex) {
                error(ex);
            }
        }
        else {
            if ((parentProperty.properties && parentProperty.properties.length > 0) && !property.group)
                property.group = property.title;
            if (!property._.parentPropertiesCompared) {
                property._.parentPropertiesCompared = true;
                compareParentProperties(property.properties, parentProperty.properties, entity);
            }
        }
    }
}
function getEntityName(id) {
    let obj = findEntity(id);
    return obj ? obj.name : null;
}
exports.getEntityName = getEntityName;
function $t(cn, text, useDictionary) {
    return getText(cn, text, useDictionary);
}
exports.$t = $t;
function getText(cn, text, useDictionary) {
    if (cn == null || !cn.locale)
        return (text || "").toString();
    if (!text)
        return "";
    if (typeof text == "string" && useDictionary)
        text = exports.glob.dictionary[cn.db + "." + text] || exports.glob.dictionary["sys." + text] || text;
    if (typeof text == "string")
        return text;
    let localeName = types_1.Locale[cn.locale];
    if (text[localeName])
        return text[localeName];
    else
        return _.values(text)[0];
}
exports.getText = getText;
async function verifyEmailAccounts(cn) {
    assert(exports.glob.clientConfig[cn.db].emailAccounts, `Email accounts is empty`);
    for (const account of exports.glob.clientConfig[cn.db].emailAccounts) {
        const transporter = nodemailer.createTransport({
            host: account.smtpServer,
            port: account.smtpPort,
            secure: account.secure,
            auth: { user: account.username, pass: account.password }
        });
        await new Promise((resolve, reject) => {
            transporter.verify(function (err) {
                if (err) {
                    reject(err);
                }
                else {
                    info(`Account '${account.username}' is verified!`);
                    resolve();
                }
            });
        });
    }
}
exports.verifyEmailAccounts = verifyEmailAccounts;
async function sendEmail(cn, from, to, subject, content, params) {
    assert(exports.glob.clientConfig[cn.db].emailAccounts, `Email accounts is empty`);
    const account = exports.glob.clientConfig[cn.db].emailAccounts.find(account => account.email == from);
    assert(account, `Email account for account '${from}' not found!`);
    const transporter = nodemailer.createTransport({
        host: account.smtpServer,
        port: account.smtpPort,
        secure: account.secure,
        auth: { user: account.username, pass: account.password }
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
    let mailOptions = { from, to, subject };
    if (params && params.isHtml)
        mailOptions.html = content;
    else
        mailOptions.text = content;
    return new Promise((resolve, reject) => {
        transporter.sendMail(mailOptions, function (err, info) {
            if (err) {
                error(`Sending email from '${from}' to '${to} failed`);
                reject(err);
            }
            else {
                log(`Sending email from '${from}' to '${to} done!`);
                resolve(info.response);
            }
        });
    });
}
exports.sendEmail = sendEmail;
async function sendSms(cn, provider, from, to, text, params) {
    assert(exports.glob.clientConfig[cn.db].smsAccounts, `Sms accounts is empty`);
    const account = exports.glob.clientConfig[cn.db].smsAccounts.find(account => account.provider.toLowerCase().trim() == provider.toLowerCase().trim());
    return new Promise((resolve, reject) => {
        switch (provider) {
            case types_1.SmsProvider.Infobip:
                const auth = 'Basic ' + Buffer.from(account.username + ':' + account.password).toString('base64');
                const url = new URL(account.uri);
                const data = JSON.stringify({ from, to, text });
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
                const req = https.request(options, res => resolve(res.statusCode));
                req.on('error', reject);
                req.write(data);
                req.end();
                break;
            default:
                throwError(types_1.StatusCode.NotImplemented);
        }
    });
}
exports.sendSms = sendSms;
function getEnumText(cn, enumType, value) {
    if (value == null)
        return "";
    let theEnum = getEnumByName(cn.db, cn.app ? cn.app.dependencies : null, enumType);
    if (!theEnum)
        return value.toString();
    let text = theEnum[value];
    return getText(cn, text);
}
exports.getEnumText = getEnumText;
function getEnumItems(cn, enumName) {
    let theEnum = exports.glob.enums.find(e => e.name == enumName);
    if (!theEnum)
        return null;
    return theEnum.items.map(item => {
        return { ref: item.value, title: getText(cn, item.title) };
    });
}
exports.getEnumItems = getEnumItems;
function getEnum(cn, enumName) {
    return exports.glob.enums.find(e => e.name == enumName);
}
exports.getEnum = getEnum;
function getEnumByName(thePackage, dependencies, enumType) {
    let theEnum = exports.glob.enumTexts[thePackage + "." + enumType];
    if (!theEnum && dependencies)
        for (let i = 0; !theEnum && i < dependencies.length; i++) {
            theEnum = exports.glob.enumTexts[dependencies[i] + "." + enumType];
        }
    return theEnum;
}
exports.getEnumByName = getEnumByName;
function isRightToLeftLanguage(loc) {
    return loc == types_1.Locale.ar || loc == types_1.Locale.fa;
}
exports.isRightToLeftLanguage = isRightToLeftLanguage;
function encodeXml(text) {
    return (text || "").toString().replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
exports.encodeXml = encodeXml;
function jsonToXml(json) {
    return xmlBuilder.create(json).toString();
}
exports.jsonToXml = jsonToXml;
function setIntervalAndExecute(fn, t) {
    fn();
    return (setInterval(fn, t));
}
exports.setIntervalAndExecute = setIntervalAndExecute;
function getAllFiles(path) {
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
exports.getAllFiles = getAllFiles;
function getPathSize(path) {
    let files = getAllFiles(path);
    let totalSize = 0;
    files.forEach(function (f) {
        totalSize += fs.statSync(f).size;
    });
    return totalSize;
}
exports.getPathSize = getPathSize;
function applyFileQuota(dir, quota) {
    while (true) {
        let rootPathes = fs.readdirSync(dir);
        let size = getPathSize(dir);
        if (size < quota)
            break;
        let oldestPath = _.minBy(rootPathes, function (f) {
            let fullPath = path.join(dir, f);
            return fs.statSync(fullPath).ctime;
        });
        oldestPath = path.join(dir, oldestPath);
        try {
            fs.removeSync(oldestPath);
        }
        catch (ex) {
            error(`Can not remove path: '${oldestPath}'`);
        }
    }
}
exports.applyFileQuota = applyFileQuota;
function toQueryString(obj) {
    let str = '';
    for (const key in obj) {
        str += '&' + key + '=' + obj[key];
    }
    return str.slice(1);
}
exports.toQueryString = toQueryString;
function digitGroup(value) {
    if (!value)
        return "0";
    return value.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,");
}
exports.digitGroup = digitGroup;
function jsonReviver(key, value) {
    if (value && value.toString().indexOf("__REGEXP ") == 0) {
        let m = value.split("__REGEXP ")[1].match(/\/(.*)\/(.*)?/);
        return new RegExp(m[1], m[2] || "");
    }
    else if (value && value.toString().indexOf("__Reference ") == 0) {
        return newID(value.split("__Reference ")[1]);
    }
    else
        return value;
}
exports.jsonReviver = jsonReviver;
function parseDate(loc, date) {
    if (!date)
        return null;
    let match = date.match(/(\d+)\/(\d+)\/(\d+)/);
    if (!match)
        return new Date(date);
    let year = parseInt(match[1]);
    let month = parseInt(match[2]);
    let day = parseInt(match[3]);
    let result = null;
    if (loc == types_1.Locale.fa) {
        if (day > 31) {
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
    }
    else
        result = new Date(year, month, day);
    match = date.match(/(\d+):(\d+):?(\d+)?/);
    if (match && result) {
        result.setHours(parseInt(match[1]) || 0);
        result.setMinutes(parseInt(match[2]) || 0);
        result.setSeconds(parseInt(match[3]) || 0);
    }
    return result;
}
exports.parseDate = parseDate;
async function getTypes(cn) {
    let objects = allObjects(cn).map(ent => {
        let title = getText(cn, ent.title) + (cn.db == ent._.db ? "" : " (" + ent._.db + ")");
        return Object.assign(Object.assign({}, ent), { title });
    });
    let functions = allFunctions(cn).map(ent => {
        let title = getText(cn, ent.title) + (cn.db == ent._.db ? "" : " (" + ent._.db + ")");
        return Object.assign(Object.assign({}, ent), { title });
    });
    let enums = exports.glob.enums.filter(en => containsPack(cn, en._.db)).map(ent => {
        let title = getText(cn, ent.title) + (cn.db == ent._.db ? "" : " (" + ent._.db + ")");
        return Object.assign(Object.assign({}, ent), { title });
    });
    let types = objects.concat(functions, enums);
    types = _.orderBy(types, ['title']);
    let ptypes = [];
    for (const type in types_1.PType) {
        ptypes.push({ _id: newID(types_1.PType[type]), title: getText(cn, type, true) });
    }
    types.unshift({ _id: null, title: "-" });
    types = ptypes.concat(types);
    return types;
}
exports.getTypes = getTypes;
function containsPack(cn, db) {
    return db == cn.db || cn.app.dependencies.indexOf(db) > -1;
}
exports.containsPack = containsPack;
async function getDataEntities(cn) {
    let entities = exports.glob.entities.filter(e => e.entityType == types_1.EntityType.Function || e.entityType == types_1.EntityType.Object);
    return makeEntityList(cn, entities);
}
exports.getDataEntities = getDataEntities;
function getAllEntities(cn) {
    let entities = exports.glob.entities.filter(en => cn.db == en._.db || cn.app.dependencies.indexOf(en._.db) > -1);
    let end = entities.find((e => e.name == "clients"));
    return makeEntityList(cn, entities);
}
exports.getAllEntities = getAllEntities;
async function dropDatabase(dbName) {
    let db = await dbConnection({ db: dbName });
    return db.dropDatabase();
}
exports.dropDatabase = dropDatabase;
async function initializeMinaDb(cn, dbName, serviceDb) {
    let dbc = { db: dbName };
    let adminRole = { _id: newID(), title: "Admin" };
    let systemRole = { _id: newID(), title: "System", roles: [adminRole._id] };
    await put(dbc, types_1.Objects.roles, [systemRole, adminRole]);
    let defaultDrive = { title: "Default", type: types_1.SourceType.File, address: `public` };
    await put(dbc, types_1.Objects.drives, [defaultDrive]);
    let sysDrive = { title: "Sys Public", type: types_1.SourceType.File, address: `./sys-ui/public` };
    await put(dbc, types_1.Objects.drives, [sysDrive]);
    await put(dbc, types_1.Objects.forms, [{ name: "home", title: "Home", elems: [{ type: 1, _id: newID(), text: { "content": "## Welcome!\n", "markdown": true }, styles: "p-4" }], publish: true }]);
    let obj_objects = { _id: newID(), name: "objects", title: { "en": "Objects" }, source: 1, isList: true, referType: 0, reference: newID(types_1.ObjectIDs.objects), access: { "items": [{ "role": systemRole._id, "permission": 255, "_id": newID() }] } };
    let obj_functions = { _id: newID(), name: "functions", title: { "en": "Functions" }, source: 1, isList: true, referType: 0, reference: newID(types_1.ObjectIDs.functions), access: { "items": [{ "role": systemRole._id, "permission": 255, "_id": newID() }] } };
    let obj_roles = { _id: newID(), name: "roles", title: { "en": "Roles" }, source: 1, isList: true, referType: 0, reference: newID(types_1.ObjectIDs.roles), access: { "items": [{ "role": systemRole._id, "permission": 255, "_id": newID() }] } };
    let obj_menus = { _id: newID(), name: "menus", title: { "en": "Menus" }, source: 1, isList: true, referType: 0, reference: newID(types_1.ObjectIDs.menus), access: { "items": [{ "role": systemRole._id, "permission": 255, "_id": newID() }] } };
    let obj_apps = { _id: newID(), name: "apps", title: { "en": "Apps" }, source: 1, isList: true, referType: 0, reference: newID(types_1.ObjectIDs.apps), access: { "items": [{ "role": systemRole._id, "permission": 255, "_id": newID() }] } };
    let obj_dictionary = { _id: newID(), name: "dictionary", title: { "en": "Dictionary" }, source: 1, isList: true, referType: 0, reference: newID(types_1.ObjectIDs.dictionary), access: { "items": [{ "role": systemRole._id, "permission": 255, "_id": newID() }] } };
    let obj_forms = { _id: newID(), name: "forms", title: { "en": "Forms" }, source: 1, isList: true, referType: 0, reference: newID(types_1.ObjectIDs.forms), access: { "items": [{ "role": systemRole._id, "permission": 255, "_id": newID() }] } };
    let obj_enums = { _id: newID(), name: "enums", title: { "en": "Enums" }, source: 1, isList: true, referType: 0, reference: newID(types_1.ObjectIDs.enums), access: { "items": [{ "role": systemRole._id, "permission": 255, "_id": newID() }] } };
    let obj_drives = { _id: newID(), name: "drives", title: { "en": "Drives" }, source: 1, isList: true, referType: 0, reference: newID(types_1.ObjectIDs.drives), access: { "items": [{ "role": systemRole._id, "permission": 255, "_id": newID() }] } };
    let obj_users = { _id: newID(), name: "users", title: { "en": "Users" }, source: 1, isList: true, referType: 0, reference: newID(types_1.ObjectIDs.users), access: { "items": [{ "role": systemRole._id, "permission": 255, "_id": newID() }] } };
    let obj_hosts = { _id: newID(), name: "hosts", title: { "en": "Hosts" }, source: 1, isList: true, referType: 0, reference: newID(types_1.ObjectIDs.hosts), access: { "items": [{ "role": systemRole._id, "permission": 255, "_id": newID() }] } };
    let obj_clientConfig = { _id: newID(), name: "hosts", title: { "en": "Client Config" }, source: 1, isList: false, referType: 0, reference: newID(types_1.ObjectIDs.clientConfig), access: { "items": [{ "role": systemRole._id, "permission": 255, "_id": newID() }] } };
    await put(dbc, types_1.Objects.objects, [obj_functions, obj_objects, obj_roles, obj_dictionary, obj_forms, obj_enums, obj_apps, obj_drives, obj_menus]);
    if (!serviceDb)
        await put(dbc, types_1.Objects.objects, [obj_users, obj_hosts, obj_clientConfig]);
    let menuItems = [
        { entity: obj_objects._id, "_id": newID() },
        { entity: obj_functions._id, "_id": newID() },
        { entity: obj_forms._id, "_id": newID() },
        { title: "-", "_id": newID() },
        { entity: obj_apps._id, _id: newID() },
        { entity: obj_drives._id, _id: newID() },
        { entity: obj_menus._id, _id: newID() },
        { entity: obj_enums._id, _id: newID() },
        { entity: obj_dictionary._id, _id: newID() },
        { title: "-", _id: newID() },
        { _id: newID(), entity: obj_roles._id },
    ];
    if (!serviceDb) {
        menuItems = menuItems.concat([
            { "entity": obj_users._id, "_id": newID() },
            { "entity": obj_hosts._id, "_id": newID() },
            { "entity": obj_clientConfig._id, "_id": newID() }
        ]);
    }
    let menu = { _id: newID(), title: "Default", items: menuItems };
    await put(dbc, types_1.Objects.menus, [menu]);
    let appSys = {
        _id: newID(),
        title: "System",
        menu: menu._id,
        locales: [1033, 1025, 1055, 1065],
        defaultLocale: 1033,
        home: "home",
        iconStyle: "fad fa-cogs",
        navColor: "#258",
        iconColor: "#258",
    };
    await put(dbc, types_1.Objects.apps, [appSys]);
    return { defaultDrive, sysDrive, appSys, adminRole, systemRole };
}
exports.initializeMinaDb = initializeMinaDb;
function makeEntityList(cn, entities) {
    let items = entities.map(ent => {
        let title = getText(cn, ent.title) + (cn.db == ent._.db ? "" : " (" + ent._.db + ")");
        let _cs = null;
        switch (ent.entityType) {
            case types_1.EntityType.Object:
                _cs = types_1.Constants.ClassStyle_Object;
                break;
            case types_1.EntityType.Function:
                _cs = types_1.Constants.ClassStyle_Function;
                break;
            case types_1.EntityType.Form:
                _cs = types_1.Constants.ClassStyle_Form;
                break;
        }
        return { _id: ent._id, title, _cs };
    });
    return _.orderBy(items, ['title']);
}
exports.makeEntityList = makeEntityList;
async function getInnerPropertyReferenceValues(cn, foreignObj, db, prop, instance) {
    assert(prop.dependsOn, `DependsOn property must be set for InnerSelectType property: ${prop.name}`);
    assert(prop.foreignProperty, `ForeignProperty must be set for InnerSelectType property: ${prop.name}`);
    let val = instance ? instance[prop.dependsOn] : null;
    if (!val)
        return [];
    let result = await get({ db }, foreignObj.name, { itemId: val });
    if (!result)
        return [];
    let foreignProp = foreignObj.properties.find(p => p.name == prop.foreignProperty);
    assert(foreignProp, `Foreign property '${prop.foreignProperty}' not found!`);
    let foreignTitleProp = foreignProp.properties.find(p => foreignProp.titleProperty ? p.name == foreignObj.titleProperty : p.name == types_1.Constants.titlePropertyName);
    assert(foreignTitleProp, `Foreign object needs the title property`);
    let items = result[prop.foreignProperty];
    if (!items)
        return [];
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
        };
    });
}
async function getPropertyObjectReferenceValues(cn, obj, prop, instance, phrase, query) {
    let db = obj._.db;
    if (prop.filter && !query)
        return [];
    if (prop.referType == types_1.PropertyReferType.InnerSelectType) {
        if (Array.isArray(instance)) {
            let values = [];
            for (let item of instance) {
                values = values.concat(await getInnerPropertyReferenceValues(cn, obj, db, prop, item));
            }
            return values;
        }
        else
            return await getInnerPropertyReferenceValues(cn, obj, db, prop, instance);
    }
    else if (phrase == "") {
    }
    else if (phrase != null) {
        let titlePropName = obj.titleProperty || "title";
        let titleProp = obj.properties.find(p => p.name == titlePropName);
        if (titleProp) {
            let phraseQuery;
            if (titleProp.text && titleProp.text.multiLanguage) {
                let filterGlobal = {};
                let filterLocalize = {};
                filterGlobal[titlePropName] = new RegExp(phrase, "i");
                filterLocalize[titlePropName + "." + types_1.Locale[cn.locale]] = new RegExp(phrase, "i");
                phraseQuery = { $or: [filterGlobal, filterLocalize] };
            }
            else {
                phraseQuery = {};
                phraseQuery[titlePropName] = new RegExp(phrase, "i");
            }
            query = query ? { $and: [query, phraseQuery] } : phraseQuery;
        }
    }
    else if (!query) {
        if (Array.isArray(instance)) {
            let values = instance.filter(i => i[prop.name]).map(i => i[prop.name]);
            if (values.length)
                query = { _id: { $in: values } };
        }
        else if (instance) {
            let value = instance[prop.name];
            if (value) {
                if (Array.isArray(value))
                    query = { _id: { $in: value } };
                else
                    query = { _id: value };
            }
        }
    }
    let result = await get({ db, locale: cn.locale }, obj.name, { count: types_1.Constants.referenceValuesLoadCount, query });
    if (result)
        return result.map(item => {
            return {
                ref: item._id,
                title: getText(cn, obj.titleProperty ? item[obj.titleProperty] : item.title)
            };
        });
    else
        throw types_1.StatusCode.NotFound;
}
async function getPropertyFunctionReferenceValues(cn, func, prop, instance, phrase, query) {
    let args = [];
    if (func.properties)
        for (const param of func.properties) {
            switch (param.name) {
                case "meta":
                    args.push(prop);
                    break;
                case "item":
                    args.push(instance);
                    break;
                default:
                    args.push(null);
                    break;
            }
        }
    try {
        let items = await invoke(cn, func, args);
        if (items == null)
            return [];
        if (!Array.isArray(items)) {
            error('getPropertyReferenceValues: the function result must be an array of Pair.');
        }
        else {
            items = items.map(item => {
                let title = getText(cn, item.title, false) || item.name;
                let pair = { title, ref: item._id };
                if (item._cs)
                    pair._cs = item._cs;
                return pair;
            });
            if (phrase)
                items = items.filter(item => item.title && item.title.toLowerCase().indexOf(phrase.toLowerCase()) > -1);
        }
        return items;
    }
    catch (ex) {
        error(`getPropertyReferenceValues: the function '${func.name}' invoke failed: ${ex.message}`);
        return [];
    }
}
async function getPropertyReferenceValues(cn, prop, instance, phrase, query) {
    if (prop._.enum)
        return (prop._.enum.items || []).map(item => {
            return { ref: item.value, title: getText(cn, item.title) };
        });
    let entity = findEntity(prop.type);
    assert(entity, `Property '${prop.name}' type '${prop.type}' not found.`);
    if (entity.entityType == types_1.EntityType.Object)
        return await getPropertyObjectReferenceValues(cn, entity, prop, instance, phrase, query);
    else if (entity.entityType == types_1.EntityType.Function)
        return await getPropertyFunctionReferenceValues(cn, entity, prop, instance, phrase, query);
}
exports.getPropertyReferenceValues = getPropertyReferenceValues;
function mockCheckMatchInput(cn, func, args, sample) {
    for (const key in sample.input) {
        if (!_.isEqual(sample.input[key], cn.req[key]))
            return false;
    }
    return true;
}
async function mock(cn, func, args) {
    log(`mocking function '${cn.db}.${func.name}' ...`);
    if (!func.test.samples || !func.test.samples.length)
        return { code: types_1.StatusCode.Ok, message: "No sample data!" };
    let withInputs = func.test.samples.filter(sample => sample.input);
    for (const sample of withInputs) {
        if (mockCheckMatchInput(cn, func, args, sample)) {
            if (sample.code)
                return { code: sample.code, message: sample.message, result: sample.result };
            else
                return sample.input;
        }
    }
    let withoutInput = func.test.samples.find(sample => !sample.input);
    if (withoutInput) {
        if (withoutInput.code)
            return { code: withoutInput.code, message: withoutInput.message };
        else
            return withoutInput.input;
    }
    return { code: types_1.StatusCode.Ok, message: "No default sample data!" };
}
exports.mock = mock;
async function invokeFuncMakeArgsReady(cn, func, action, args) {
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
    let fileParams = func.properties.filter(p => p._.gtype == types_1.GlobalType.file);
    if (fileParams.length) {
        let uploadedFiles = await getUploadedFiles(cn, true);
        for (const param of fileParams) {
            if (param.isList)
                throwError(types_1.StatusCode.NotImplemented, `no support for multiple files params!`);
            let val = argData[param.name];
            if (val) {
                let file = uploadedFiles.find(f => f.name == val.name);
                if (!file)
                    throwError(types_1.StatusCode.BadRequest, `parameter '${param.name}' is mandatory!`);
                val._ = val._ || {};
                val._.rawData = file.rawData;
            }
        }
    }
    for (const prop of func.properties) {
        let val = argData[prop.name];
        if (val == null && prop.required)
            throwError(types_1.StatusCode.BadRequest, `parameter '${prop.name}' is mandatory!`);
        if (prop._.isRef && !prop._.enum && prop.viewMode != types_1.PropertyViewMode.Hidden && prop.useAsObject && isID(val)) {
            let refObj = findEntity(prop.type);
            if (!refObj)
                throwError(types_1.StatusCode.UnprocessableEntity, `referred object for property '${cn.db}.${prop.name}' not found!`);
            if (refObj.entityType == types_1.EntityType.Object)
                argData[prop.name] = await get({ db: cn.db }, refObj.name, { itemId: val });
            else if (refObj.entityType == types_1.EntityType.Function) {
            }
        }
    }
    return Object.values(argData);
}
async function invoke(cn, func, args) {
    if (func.test && func.test.mock && process.env.NODE_ENV == types_1.EnvMode.Development && cn.url.pathname != "/functionTest") {
        return await mock(cn, func, args);
    }
    let pathPath = getAbsolutePath('./' + (func.pack == "web" ? "web/src/web" : func.pack));
    let action = require(pathPath)[func.name];
    if (!action) {
        if (!action) {
            let app = exports.glob.apps.find(app => app._.db == cn.db);
            for (const pack of app.dependencies) {
                action = require(pathPath)[func.name];
                if (action)
                    break;
            }
        }
    }
    if (!action)
        throw types_1.StatusCode.NotImplemented;
    args = await invokeFuncMakeArgsReady(cn, func, action, args);
    let result;
    if (args.length == 0)
        result = await action(cn);
    else
        result = await action(cn, ...args);
    return result;
}
exports.invoke = invoke;
async function getUploadedFiles(cn, readBuffer) {
    let files = [];
    assert(cn["httpReq"].files, "files is not ready in the request");
    for (const file of cn["httpReq"].files) {
        let buffer;
        if (readBuffer) {
            buffer = await fs.readFile(file.path);
            await fs.remove(file.path);
        }
        let fileInfo = { name: file.originalname, rawData: buffer, path: file.path };
        files.push(fileInfo);
    }
    return files;
}
exports.getUploadedFiles = getUploadedFiles;
async function runFunction(cn, functionId, input) {
    let func = findEntity(functionId);
    if (!func)
        throw types_1.StatusCode.NotFound;
    input = input || {};
    let args = [];
    if (func.properties)
        for (const para of func.properties) {
            args.push(input[para.name]);
        }
    return invoke(cn, func, args);
}
exports.runFunction = runFunction;
function isID(value) {
    if (!value)
        return false;
    return value._bsontype;
}
exports.isID = isID;
function throwError(code, message) {
    throw new types_1.ErrorObject(code, message);
}
exports.throwError = throwError;
function throwContextError(cn, code, message) {
    message = message || getErrorCodeMessage(cn, code);
    throw new types_1.ErrorObject(code, message);
}
exports.throwContextError = throwContextError;
function getErrorCodeMessage(cn, code) {
    return `${$t(cn, "error")} (${code}): ${getEnumText(cn, "StatusCode", code)}`;
}
exports.getErrorCodeMessage = getErrorCodeMessage;
function checkUserRole(cn, role) {
    if (!cn.user)
        return false;
    return !!cn.user.roles.find(role => role.equals(role));
}
exports.checkUserRole = checkUserRole;
function getReference(id) {
    return newID(id);
}
exports.getReference = getReference;
function clientLog(cn, message, type = types_1.LogType.Debug, ref) {
    logger.log(types_1.LogType[type].toLowerCase(), message);
    exports.glob.postClientCommandCallback(cn, types_1.ClientCommand.Log, message, type, ref);
}
exports.clientLog = clientLog;
function clientCommand(cn, command, ...args) {
    exports.glob.postClientCommandCallback(cn, command, ...args);
}
exports.clientCommand = clientCommand;
async function removeDir(dir) {
    return new Promise((resolve, reject) => {
        rimraf(dir, { silent: true }, ex => {
            if (ex)
                reject(ex);
            else
                resolve();
        });
    });
}
exports.removeDir = removeDir;
async function clientQuestion(cn, title, message, optionsEnum) {
    return new Promise(resolve => {
        let items = getEnumItems(cn, optionsEnum);
        let waitFn = answer => resolve(answer);
        let questionID = newID().toString();
        exports.glob.clientQuestionCallbacks[cn["httpReq"].session.id + ":" + questionID] = waitFn;
        exports.glob.postClientCommandCallback(cn, types_1.ClientCommand.Question, title, message, items, questionID);
    });
}
exports.clientQuestion = clientQuestion;
function clientAnswerReceived(sessionId, questionID, answer) {
    let waitFn = exports.glob.clientQuestionCallbacks[sessionId + ":" + questionID];
    if (waitFn) {
        waitFn(answer);
        delete exports.glob.clientQuestionCallbacks[sessionId + ":" + questionID];
    }
    else
        error(`clientQuestionCallbacks not found for session:'${sessionId}', question:'${questionID}'`);
}
exports.clientAnswerReceived = clientAnswerReceived;
function clientNotify(cn, title, message, url, icon) {
    exports.glob.postClientCommandCallback(cn, types_1.ClientCommand.Notification, title, message, url, icon);
}
exports.clientNotify = clientNotify;
async function execShellCommand(cmd, std) {
    return new Promise((resolve) => {
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
exports.execShellCommand = execShellCommand;
function sort(array, prop = "_z") {
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
exports.sort = sort;
async function countryNameLookup(ip) {
    if (/^::/.test(ip))
        return "[LOCAL]";
    let countryCode = await countryLookup(ip);
    let country = countryCode ? exports.glob.countries[countryCode] : null;
    if (country)
        return country.name;
    else
        return null;
}
exports.countryNameLookup = countryNameLookup;
async function countryLookup(ip) {
    const file = getAbsolutePath('./sys/assets/GeoLite2-Country.mmdb');
    const lookup = await maxmind_1.default.open(file);
    let result = lookup.get(ip);
    if (!result || !result.country) {
        error(`Country for ip '${ip}' not found.`);
        return null;
    }
    return result.country.iso_code;
}
exports.countryLookup = countryLookup;
async function hashPassword(password) {
    return new Promise((resolve, reject) => {
        const saltRounds = 10;
        bcrypt.hash(password, saltRounds, function (err, hash) {
            if (err)
                reject(err);
            else
                resolve(hash);
        });
    });
}
exports.hashPassword = hashPassword;
function getPortionProperties(cn, obj, portion, data, viewType) {
    let props;
    switch (portion.type) {
        case types_1.RefPortionType.entity:
            props = _.cloneDeep(obj.properties);
            break;
        case types_1.RefPortionType.item:
            return getPortionProperties(cn, obj, portion.pre, data, viewType);
        case types_1.RefPortionType.property:
            props = _.cloneDeep(portion.property.properties);
            break;
    }
    return filterAndSortProperties(cn, props, true, _.isArray(data), viewType);
}
exports.getPortionProperties = getPortionProperties;
function filterAndSortProperties(cn, properties, root, gridView, viewType) {
    if (!properties || !properties.length)
        return properties;
    let result = properties.filter(p => p.viewMode !== types_1.PropertyViewMode.Hidden);
    if (viewType != types_1.ObjectViewType.TreeView && gridView)
        result = result.filter(p => {
            return p.viewMode !== types_1.PropertyViewMode.DetailViewVisible &&
                p.type &&
                (!p.text || !p.text.password) &&
                (p._.gtype != types_1.GlobalType.object) &&
                (p.referType != types_1.PropertyReferType.inlineData || !p._.isRef || exports.glob.enums[getEntityName(p.type)]) &&
                (root || !(p.isList && p.properties && p.properties.length > 0));
        });
    if (viewType != types_1.ObjectViewType.TreeView)
        result = result.filter(p => checkPropertyPermission(p, cn.user) != types_1.AccessAction.None);
    result = _.sortBy(result, "_z");
    for (const prop of result) {
        if (prop._.sorted)
            continue;
        prop._.sorted = true;
        if (prop.properties)
            prop.properties = filterAndSortProperties(cn, prop.properties, false, prop.isList, viewType);
    }
    return result;
}
exports.filterAndSortProperties = filterAndSortProperties;
function checkPropertyPermission(property, user) {
    return types_1.AccessAction.Full;
}
async function createDeclare(cn, ref, properties, data, partial, obj, links) {
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
    };
    let portion = cn.portions[cn.portions.length - 1];
    if (portion.type == types_1.RefPortionType.entity && obj.newItemMode)
        dec.newItemMode = obj.newItemMode;
    if (obj.detailsViewType)
        dec.detailsViewType = obj.detailsViewType;
    if (obj.listsViewType)
        dec.listsViewType = obj.listsViewType;
    if (Array.isArray(data) && cn["pages"] && cn.portions.length == 1)
        dec.pageLinks = getPageLinks(cn, dec.ref);
    for (const prop of dec.properties) {
        await preparePropertyDeclare(cn, ref, prop, data, partial, dec.access);
    }
    await handleObjectDeclareFilter(obj, cn, ref, dec);
    return dec;
}
exports.createDeclare = createDeclare;
async function handleObjectDeclareFilter(obj, cn, ref, dec) {
    if (obj._.filterObject) {
        let filterProperties = _.cloneDeep(obj._.filterObject.properties.filter(p => p.viewMode != types_1.PropertyViewMode.Hidden));
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
        dec.filterDec = { properties: filterProperties };
        dec.filterData = filterData;
    }
}
async function applyPropertiesDefaultValue(cn, instance, properties) {
    if (!properties)
        return;
    for (let property of properties) {
        if (property.defaultValue != null) {
            if (instance[property.name] == null) {
                let value = getPropertySpecialValue(cn, property, property.defaultValue);
                if (value != null)
                    instance[property.name] = value;
            }
        }
        else if (property.number && property.number.autoIncrement && !instance[property.name]) {
            if (property._.sequence == null)
                property._.sequence = await max(cn, cn["entity"].name, property.name) || property.number.seed || 1;
            instance[property.name] = ++property._.sequence;
        }
        else if (property.properties) {
            let val = {};
            await applyPropertiesDefaultValue(cn, val, property.properties);
            if (!_.isEmpty(val))
                instance[property.name] = val;
        }
    }
}
exports.applyPropertiesDefaultValue = applyPropertiesDefaultValue;
function getPropertySpecialValue(cn, property, value) {
    if (!value || !property.type)
        return value;
    if (property._.isRef) {
        if (value == "_new_")
            return new mongodb_1.ObjectId();
        else if (value == "_user_")
            return cn.user ? cn.user._id : null;
    }
    else if (property.type.toString() === types_1.PType.time) {
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
function getPageLinks(cn, ref) {
    let start = Math.max(2, cn.page - 1);
    let end = Math.min(cn.pages - 1, cn.page + 3);
    let list = [];
    list.push(1);
    if (start == 3)
        list.push(2);
    else if (start > 2)
        list.push(0);
    for (let i = start; i <= end; i++)
        list.push(i);
    if (start < cn.pages - 1 && end < cn.pages - 1)
        list.push(0);
    list.push(cn.pages);
    let result = [];
    let url = Url.parse(ref);
    let search = qs.parse(_.trim(url.search, '?'));
    if (cn.query)
        search.q = bson_util_1.stringify(cn.query, true);
    for (let i = 0; i < list.length; i++) {
        if (list[i] != 1)
            search.p = list[i].toString();
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
exports.getPageLinks = getPageLinks;
function stringifySortUri(sort) {
    let parts = [];
    for (const key in sort) {
        if (sort[key] === 1)
            parts.push(key);
        else
            parts.push("-" + key);
    }
    return parts.join(';');
}
function prepareUrl(cn, ref) {
    if (!ref)
        return ref;
    ref = _.trim(ref, "?");
    let separator = ref.indexOf('?') == -1 ? "?" : "&";
    let search = [];
    if (cn.locale !== cn.app.defaultLocale)
        search.push(`${types_1.ReqParams.locale}=${types_1.Locale[cn.locale]}`);
    if (cn.sort)
        search.push(`${types_1.ReqParams.sort}=${stringifySortUri(cn.sort)}`);
    let url = "/" + ref + (search.join("&") ? separator : "") + search.join("&");
    if (cn.prefix)
        url = `/${cn.prefix}${url}`;
    return url;
}
exports.prepareUrl = prepareUrl;
function getPropertyRef(prop, parentRef) {
    return parentRef + "/" + prop.name;
}
async function preparePropertyDeclare(cn, ref, prop, instance, partial, parentAccess) {
    if (prop._.ref)
        return;
    prop._.ref = getPropertyRef(prop, ref);
    instance = (cn.res.data ? cn.res.data[prop._.ref] : null) || instance;
    prop.title = $t(cn, prop.title);
    let group = $t(cn, prop.group) || (prop._.gtype == types_1.GlobalType.object ? prop.title : $t(cn, "prop-public-group", true));
    prop.group = $t(cn, group);
    if (prop.links && prop.links.length)
        prop.links = makeLinksReady(cn, ref, instance, prop.links);
    if (prop._.gtype == types_1.GlobalType.object)
        await prepareObjectPropertyDeclare(cn, ref, prop, instance, partial, parentAccess);
    else {
        prop.editMode = getPropertyEditMode(cn, prop);
        prop.comment = $t(cn, prop.comment);
        if (prop._.isRef) {
            let items = await getPropertyReferenceValues(cn, prop, instance, null, null);
            if (items) {
                for (const item of items) {
                    item.hover = false;
                }
                prop._.items = items;
            }
            else
                prop._.items = [];
        }
    }
}
exports.preparePropertyDeclare = preparePropertyDeclare;
function getPropertyEditMode(cn, prop) {
    return prop.editMode;
}
function checkAccess(cn, entity) {
    let permissions = entity._.permissions;
    let permission = entity.guestAccess || types_1.AccessAction.None;
    if (!permissions || !permissions.length)
        return permission;
    if (!cn.user)
        return permission;
    for (let access of permissions) {
        if ((access.user && cn.user._id.equals(access.user)) ||
            (access.role && cn.user.roles && cn.user.roles.some(r => r.equals(access.role)))) {
            switch (access.permission) {
                case types_1.AccessAction.Full:
                    permission = types_1.AccessAction.Full;
                    break;
                case types_1.AccessAction.View:
                    permission = permission | types_1.AccessAction.View;
                    break;
                case types_1.AccessAction.Edit:
                    permission = permission | types_1.AccessAction.View | types_1.AccessAction.Edit;
                    break;
                case types_1.AccessAction.NewItem:
                    permission = permission | types_1.AccessAction.View | types_1.AccessAction.NewItem;
                    break;
                case types_1.AccessAction.DeleteItem:
                    permission = permission | types_1.AccessAction.View | types_1.AccessAction.DeleteItem;
                    break;
            }
        }
    }
    return permission;
}
exports.checkAccess = checkAccess;
function makeLinksReady(cn, ref, data, links) {
    links = JSON.parse(JSON.stringify(links || []));
    for (let link of links) {
        if (link.condition && !evalExpression(data, link.condition))
            link.disable = true;
        link.title = $t(cn, link.title);
        link.comment = $t(cn, link.comment);
        if (typeof link.address != "string") {
            error(`Link for ref '${ref}' invalid address`);
            link.address = "";
        }
        else {
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
exports.makeLinksReady = makeLinksReady;
async function prepareObjectPropertyDeclare(cn, ref, prop, instance, partial, parentAccess) {
    if (prop.documentView)
        return;
    let objectProp = _.cloneDeep(prop);
    objectProp.properties = objectProp.properties || [];
    if (partial) {
        let propObjectDec = {
            title: prop.title,
            properties: objectProp.properties,
            ref: prop._.ref,
            access: parentAccess,
            reorderable: objectProp.reorderable
        };
        if (objectProp.listsViewType)
            propObjectDec.listsViewType = objectProp.listsViewType;
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
    prop._ = { ref: objectProp._.ref, gtype: objectProp._.gtype };
    prop.isList = objectProp.isList;
    prop.group = objectProp.group || objectProp.title;
    if (prop.isList)
        prop.referType = objectProp.referType;
    if (objectProp.commentStyle)
        prop.commentStyle = objectProp.commentStyle;
    if (objectProp.reorderable)
        prop.reorderable = objectProp.reorderable;
    if (objectProp.listsViewType)
        prop.listsViewType = objectProp.listsViewType;
    if (objectProp.filter)
        prop.filter = objectProp.filter;
}
function getPropertyTypedValue(prop, value, ignoreArray) {
    if (value === "" && prop.type.toString() != types_1.PType.text)
        return null;
    if (value == null || value === "" || !prop.type)
        return value;
    if (prop.isList && !ignoreArray)
        return value.map(item => getPropertyTypedValue(prop, item, true));
    if (prop.type.toString() == types_1.PType.file)
        value._fsid = new mongodb_1.ObjectId(value._fsid);
    if (typeof value != "string")
        return value;
    switch (prop.type.toString()) {
        case types_1.PType.number:
            if (prop.number && prop.number.float)
                value = parseFloat(value);
            else
                value = parseInt(value);
            if (isNaN(value))
                throw "Invalid format for property " + prop.name;
            return value;
        case types_1.PType.boolean:
            return value.toLowerCase() == "true" || value == "1";
        case types_1.PType.id:
            return new mongodb_1.ObjectId(value);
        case types_1.PType.time:
            let date = parseDate(types_1.Locale.fa, value);
            if (value && !date)
                throw "Invalid date format for property " + prop.name;
            return date;
        default:
            if (prop._.isRef) {
                if (prop._.enum)
                    return parseInt(value);
                else if (types_1.Constants.objectIdRegex.test(value))
                    return new mongodb_1.ObjectId(value);
                else
                    return value == "0" ? null : value;
            }
            else
                return value;
    }
}
async function sessionSignin(cn, user) {
    return new Promise((resolve, reject) => {
        cn["httpReq"].login(user, async (err) => {
            if (err)
                return reject(err);
            let ip = cn["httpReq"].headers['x-forwarded-for'] || cn["httpReq"].connection.remoteAddress;
            let country = await countryNameLookup(ip);
            await audit(cn, types_1.SysAuditTypes.login, {
                user: cn["httpReq"].user._id,
                level: types_1.LogType.Info,
                comment: `User '${cn["httpReq"].user.email}' legged-in!\r\nIP:${ip}\r\nCountry:${country}`
            });
            resolve();
        });
    });
}
exports.sessionSignin = sessionSignin;
//# sourceMappingURL=sys.js.map