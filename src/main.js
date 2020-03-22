"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger = require("winston");
const mongodb = require("mongodb");
const _ = require("lodash");
const xmlBuilder = require("xmlbuilder");
const fs = require("fs-extra");
const path = require("path");
const moment = require("moment");
const graphlib = require("graphlib");
const Jalali = require("jalali-moment");
const sourceMapSupport = require("source-map-support");
const AWS = require("aws-sdk");
const rimraf = require("rimraf");
const mongodb_1 = require("mongodb");
const universalify_1 = require("universalify");
const types_1 = require("./types");
const { EJSON } = require('bson');
const { exec } = require("child_process");
exports.glob = new types_1.Global();
const fsPromises = fs.promises;
async function reload(cn) {
    let startTime = moment();
    log(`reload ...`);
    await loadSysConfig();
    await loadSystemCollections();
    await loadGeneralCollections();
    await loadAuditTypes();
    await initializeEnums();
    await initializePackages();
    await initializeRoles();
    await initializeEntities();
    let period = moment().diff(startTime, 'ms', true);
    info(`reload done in '${period}' ms.`);
}
exports.reload = reload;
async function start() {
    try {
        process.on('uncaughtException', async (err) => await audit(types_1.SysAuditTypes.uncaughtException, { level: types_1.LogType.Fatal, comment: err.message + ". " + err.stack }));
        process.on('unhandledRejection', async (err) => {
            await audit(types_1.SysAuditTypes.unhandledRejection, {
                level: types_1.LogType.Fatal,
                comment: err.message + ". " + err.stack
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
function isWindows() {
    return /^win/.test(process.platform);
}
async function audit(auditType, args) {
    args.type = args.type || new mongodb_1.ObjectId(auditType);
    args.time = new Date();
    let comment = args.comment || "";
    let type = _.find(exports.glob.auditTypes, (type) => {
        return type._id.equals(args.type);
    });
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
    await put(args.pack || types_1.Constants.sysPackage, types_1.SysCollection.audits, args);
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
async function get(pack, objectName, options) {
    let collection = await getCollection(pack, objectName);
    options = options || {};
    let result;
    if (options.itemId)
        result = collection.findOne(options.itemId);
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
    if (options && options.rawData)
        return result;
    let obj = findObject(pack, objectName);
    if (!obj)
        throw `object '${pack}.${objectName}' not found!`;
    if (!obj.isList && Array.isArray(result))
        result = result[0];
    await makeObjectReady(pack, obj.properties, result);
    return result;
}
exports.get = get;
async function makeObjectReady(pack, properties, data) {
    if (!data)
        return;
    data = Array.isArray(data) ? data : [data];
    for (let item of data) {
        for (let prop of properties) {
            let val = item[prop.name];
            if (!val)
                continue;
            if (prop._isRef && !prop._enum && prop.viewMode != types_1.PropertyViewMode.Hidden && isObjectId(val)) {
                let refObj = findEntity(prop.type);
                if (!refObj)
                    throwError(types_1.StatusCode.UnprocessableEntity, `referred object for property '${pack}.${prop.name}' not found!`);
                if (refObj.entityType == types_1.EntityType.Object)
                    item[prop.name] = await get(pack, refObj.name, { itemId: val, rawData: true });
                else if (refObj.entityType == types_1.EntityType.Function) {
                }
            }
            if (prop.properties)
                await makeObjectReady(pack, prop.properties, val);
        }
    }
}
exports.makeObjectReady = makeObjectReady;
async function getOne(pack, objectName, rawData = false) {
    return get(pack, objectName, { count: 1, rawData });
}
exports.getOne = getOne;
async function getCollection(pack, objectName) {
    let db = await connect(pack);
    return db.collection(objectName);
}
async function put(pack, objectName, item, options) {
    let collection = await getCollection(pack, objectName);
    item = item || {};
    if (!options || !options.portions || options.portions.length == 1) {
        if (item._id) {
            await collection.replaceOne({ _id: item._id }, item);
            return {
                type: types_1.ObjectModifyType.Update,
                item: item,
                itemId: item._id
            };
        }
        else {
            await collection.insertOne(item);
            return {
                type: types_1.ObjectModifyType.Insert,
                item: item,
                itemId: item._id
            };
        }
    }
    let portions = options.portions;
    switch (portions.length) {
        case 2:
            await collection.save(item);
            return ({
                type: types_1.ObjectModifyType.Update,
                item: item,
                itemId: item._id
            });
        default:
            let command = { $addToSet: {} };
            item._id = item._id || new mongodb_1.ObjectId();
            let rootId = portions[1].itemId;
            let pth = await portionsToMongoPath(pack, rootId, portions, portions.length);
            command.$addToSet[pth] = item;
            await collection.updateOne({ _id: rootId }, command);
            return {
                type: types_1.ObjectModifyType.Patch,
                item: item,
                itemId: rootId
            };
    }
}
exports.put = put;
async function portionsToMongoPath(pack, rootId, portions, endIndex) {
    if (endIndex == 3)
        return portions[2].property.name;
    let db = await connect(pack);
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
            let partItem = _.find(value, (it) => {
                return it._id && it._id.toString() == part;
            });
            if (!partItem)
                throw types_1.StatusCode.ServerError;
            path += "." + value.indexOf(partItem);
            value = partItem;
        }
    }
    return _.trim(path, '.');
}
exports.portionsToMongoPath = portionsToMongoPath;
async function count(pack, objectName, options) {
    let collection = await getCollection(pack, objectName);
    options = options || {};
    return await collection.countDocuments(options);
}
exports.count = count;
function extractRefPortions(cn, ref, _default) {
    try {
        ref = _.trim(ref, '/') || _default;
        if (!ref)
            return null;
        let portions = _.map(ref.split('/'), (portion) => {
            return { value: portion };
        });
        if (portions.length === 0)
            return null;
        if (portions[0].value === types_1.Constants.urlPortionApi) {
            portions.shift();
            cn["mode"] = types_1.RequestMode.api;
            if (portions.length < 1)
                return null;
            if (/^v\d/.test(portions[0].value))
                cn["apiVersion"] = portions.shift().value;
        }
        for (let i = 1; i < portions.length; i++) {
            portions[i].pre = portions[i - 1];
        }
        let entity = _.find(exports.glob.entities, (entity) => {
            return entity._id.toString() === portions[0].value;
        });
        if (!entity)
            entity = _.find(exports.glob.entities, { _package: cn.pack, name: portions[0].value });
        if (!entity)
            entity = _.find(exports.glob.entities, (entity) => {
                return entity.name === portions[0].value && cn["app"].dependencies.indexOf(entity._package) > -1;
            });
        if (entity) {
            portions[0].entity = entity;
            portions[0].type = types_1.RefPortionType.entity;
        }
        else
            return null;
        if (entity.entityType !== types_1.EntityType.Object || portions.length < 2)
            return portions;
        let parent = entity;
        for (let i = 1; i < portions.length; i++) {
            let pr = portions[i];
            if (parent == null) {
                warn(`Invalid path '${ref}'`);
                return null;
            }
            else if (parent._gtype == types_1.GlobalType.file) {
                pr.type = types_1.RefPortionType.file;
            }
            else if ((parent.entityType || parent.isList) && /[0-9a-f]{24}/.test(pr.value)) {
                pr.type = types_1.RefPortionType.item;
                let itemId = pr.value;
                pr.itemId = new mongodb_1.ObjectId(itemId);
            }
            else {
                pr.type = types_1.RefPortionType.property;
                parent = pr.property = _.find(parent.properties, { name: pr.value });
                if (!pr.property)
                    error(`Invalid property name '${pr.value}' in path '${ref}'`);
            }
        }
        return portions;
    }
    catch (ex) {
        error("extractRefPortions", ex);
    }
}
exports.extractRefPortions = extractRefPortions;
async function patch(pack, objectName, patchData, options) {
    let db = await connect(pack);
    let collection = db.collection(objectName);
    if (!collection)
        throw types_1.StatusCode.BadRequest;
    if (!options)
        options = { portions: [] };
    let portions = options.portions;
    if (!portions)
        portions = [{ type: types_1.RefPortionType.entity, value: objectName }];
    if (portions.length == 1)
        throw types_1.StatusCode.BadRequest;
    let theRootId = portions.length < 2 ? patchData._id : portions[1].itemId;
    let path = await portionsToMongoPath(pack, theRootId, portions, portions.length);
    let command = { $set: {}, $unset: {} };
    if (portions[portions.length - 1].property && portions[portions.length - 1].property._gtype == types_1.GlobalType.file)
        command["$set"][path] = patchData;
    else
        for (let key in patchData) {
            if (key == "_id")
                continue;
            command[patchData[key] == null ? "$unset" : "$set"][path + (path ? "." : "") + key] = patchData[key];
        }
    if (_.isEmpty(command.$unset))
        delete command.$unset;
    if (_.isEmpty(command.$set))
        delete command.$set;
    let rootId = portions[1].itemId;
    let result = await collection.updateOne({ _id: rootId }, command);
    return {
        type: types_1.ObjectModifyType.Patch,
        item: patchData,
        itemId: rootId
    };
}
exports.patch = patch;
async function del(pack, objectName, options) {
    let db = await connect(pack);
    let collection = db.collection(objectName);
    if (!collection)
        throw types_1.StatusCode.BadRequest;
    if (!options) {
        await collection.deleteMany({});
        return {
            type: types_1.ObjectModifyType.Delete
        };
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
            let path = await portionsToMongoPath(pack, rootId, portions, portions.length - 1);
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
function toAsync(fn) {
    return universalify_1.fromCallback(fn);
}
exports.toAsync = toAsync;
function getAbsolutePath(dir) {
    return /^\./.test(dir) ? path.join(process.env.PACKAGES_ROOT, dir) : dir;
}
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
            let db = await connect(drive._package);
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
async function fileExists(drive, filePath) {
    switch (drive.type) {
        case types_1.SourceType.File:
            let _path = path.join(getAbsolutePath(drive.address), filePath);
            return await fs.access(_path);
        case types_1.SourceType.Db:
            throw types_1.StatusCode.NotImplemented;
        default:
            throw types_1.StatusCode.NotImplemented;
    }
}
exports.fileExists = fileExists;
async function putFile(drive, relativePath, file) {
    switch (drive.type) {
        case types_1.SourceType.File:
            let _path = path.join(getAbsolutePath(drive.address), relativePath);
            await fs.mkdir(path.dirname(_path), { recursive: true });
            await fs.writeFile(_path, file);
            break;
        case types_1.SourceType.Db:
            let db = await connect(drive._package);
            ;
            let bucket = new mongodb.GridFSBucket(db);
            let stream = bucket.openUploadStream(relativePath);
            await delFile(drive._package, drive, relativePath);
            stream.on("error", function (err) {
                error("putFile error", err);
            }).end(file);
            break;
        case types_1.SourceType.S3:
            let sdk = getS3DriveSdk(drive);
            let s3 = new sdk.S3({ apiVersion: types_1.Constants.amazonS3ApiVersion });
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
            throw types_1.StatusCode.NotImplemented;
    }
}
exports.putFile = putFile;
async function listDir(drive, dir) {
    switch (drive.type) {
        case types_1.SourceType.File:
            let addr = path.join(getAbsolutePath(drive.address), dir);
            let list = await fsPromises.readdir(addr, { withFileTypes: true });
            let files = list.map(item => {
                return { name: item.name, type: item.isDirectory() ? types_1.DirFileType.Folder : types_1.DirFileType.File };
            });
            for (let file of files) {
                if (file.type == types_1.DirFileType.File) {
                    let stat = await fsPromises.stat(path.join(addr, file.name));
                    file.size = stat.size;
                }
            }
            return files;
        default:
            throw types_1.StatusCode.NotImplemented;
        case types_1.SourceType.S3:
            let sdk = getS3DriveSdk(drive);
            let s3 = new sdk.S3({ apiVersion: types_1.Constants.amazonS3ApiVersion });
            const s3params = {
                Bucket: drive.address,
                Prefix: _.trim(dir, '/') ? _.trim(dir, '/') + "/" : "",
                Delimiter: "/",
            };
            return new Promise((resolve, reject) => {
                let regex = new RegExp("^" + s3params.Prefix);
                s3.listObjectsV2(s3params, (err, data) => {
                    if (err)
                        reject(err);
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
            let s3 = new AWS.S3({ apiVersion: types_1.Constants.amazonS3ApiVersion });
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
    for (let part of parts) {
        uri += "/" + (part || "").replace(/^\//, '').replace(/\/$/, '');
    }
    return uri.substr(1);
}
exports.joinUri = joinUri;
function getS3DriveSdk(drive) {
    if (drive.s3._sdk)
        return drive.s3._sdk;
    const sdk = require('aws-sdk');
    if (!drive.s3.accessKeyId)
        throwError(types_1.StatusCode.ConfigurationProblem, `s3 accessKeyId for drive package '${drive._package}' must be configured.`);
    else
        sdk.config.accessKeyId = drive.s3.accessKeyId;
    if (!drive.s3.secretAccessKey)
        throwError(types_1.StatusCode.ConfigurationProblem, `s3 secretAccessKey for drive package '${drive._package}' must be configured.`);
    else
        sdk.config.secretAccessKey = drive.s3.secretAccessKey;
    drive.s3._sdk = sdk;
    return sdk;
}
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
async function loadGeneralCollections() {
    log('loadGeneralCollections ...');
    exports.glob.timeZones = await get(types_1.Constants.sysPackage, types_1.Constants.timeZonesCollection);
    let result = await get(types_1.Constants.sysPackage, types_1.SysCollection.objects, {
        query: { name: types_1.Constants.systemPropertiesObjectName },
        count: 1, rawData: true
    });
    if (!result) {
        logger.error("loadGeneralCollections failed terminating process ...");
        process.exit();
    }
    exports.glob.systemProperties = result ? result.properties : [];
}
async function loadAuditTypes() {
    log('loadAuditTypes ...');
    exports.glob.auditTypes = await get(types_1.Constants.sysPackage, types_1.SysCollection.auditTypes, { rawData: true });
}
function getEnabledPackages() {
    return exports.glob.sysConfig.packages.filter(pack => pack.enabled);
}
async function loadSysConfig() {
    let collection = await getCollection(types_1.Constants.sysPackage, types_1.SysCollection.systemConfig);
    exports.glob.sysConfig = await collection.findOne({});
    for (let pack of getEnabledPackages()) {
        try {
            exports.glob.packages[pack.name] = require(path.join(process.env.PACKAGES_ROOT, pack.name, `src/main`));
            if (exports.glob.packages[pack.name] == null)
                error(`Error loading package ${pack.name}!`);
        }
        catch (ex) {
            error("loadSysConfig", ex);
            pack.enabled = false;
        }
    }
    exports.glob.packageConfigs["web"] = { _static: require(path.join(process.env.PACKAGES_ROOT, "web", `package.json`)) };
    applyAmazonConfig();
}
function applyAmazonConfig() {
    if (exports.glob.sysConfig.amazon) {
        if (!exports.glob.sysConfig.amazon.accessKeyId)
            warn('s3 accessKeyId, secretAccessKey is required in sysConfig!');
        else
            AWS.config.accessKeyId = exports.glob.sysConfig.amazon.accessKeyId;
        if (!exports.glob.sysConfig.amazon.secretAccessKey)
            warn('s3 secretAccessKe, secretAccessKey is required in sysConfig!');
        else
            AWS.config.secretAccessKey = exports.glob.sysConfig.amazon.secretAccessKey;
    }
}
async function loadPackageSystemCollections(packConfig) {
    let pack = packConfig.name;
    log(`Loading system collections package '${pack}' ...`);
    let objects = await get(pack, types_1.SysCollection.objects, { rawData: true });
    for (let object of objects) {
        object._package = pack;
        object.entityType = types_1.EntityType.Object;
        exports.glob.entities.push(object);
    }
    let functions = await get(pack, types_1.SysCollection.functions, { rawData: true });
    for (let func of functions) {
        func._package = pack;
        func.entityType = types_1.EntityType.Function;
        exports.glob.entities.push(func);
    }
    let config = await getOne(pack, types_1.SysCollection.packageConfig, true);
    if (!config) {
        packConfig.enabled = false;
        error(`Config for package '${pack}' not found!`);
    }
    else {
        exports.glob.packageConfigs[pack] = config;
        exports.glob.packageConfigs[pack]._static = require(path.join(process.env.PACKAGES_ROOT, pack, `package.json`));
        log(`package '${pack}' loaded. version: ${exports.glob.packageConfigs[pack]._static.version}`);
    }
    let forms = await get(pack, types_1.SysCollection.forms, { rawData: true });
    for (let form of forms) {
        form._package = pack;
        form.entityType = types_1.EntityType.Form;
        exports.glob.entities.push(form);
    }
    let texts = await get(pack, types_1.SysCollection.dictionary, { rawData: true });
    for (let item of texts) {
        exports.glob.dictionary[pack + "." + item.name] = item.text;
    }
    let menus = await get(pack, types_1.SysCollection.menus, { rawData: true });
    for (let menu of menus) {
        menu._package = pack;
        exports.glob.menus.push(menu);
    }
    let roles = await get(pack, types_1.SysCollection.roles, { rawData: true });
    for (let role of roles) {
        role._package = pack;
        exports.glob.roles.push(role);
    }
    let drives = await get(pack, types_1.SysCollection.drives, { rawData: true });
    for (let drive of drives) {
        drive._package = pack;
        exports.glob.drives.push(drive);
    }
}
async function loadSystemCollections() {
    exports.glob.entities = [];
    exports.glob.dictionary = {};
    exports.glob.menus = [];
    exports.glob.roles = [];
    exports.glob.drives = [];
    for (let packConfig of getEnabledPackages()) {
        try {
            await loadPackageSystemCollections(packConfig);
        }
        catch (err) {
            error("loadSystemCollections", err);
            packConfig.enabled = false;
        }
    }
}
function configureLogger(silent) {
    let logDir = path.join(process.env.PACKAGES_ROOT, 'logs');
    const infoLogFileName = 'info.log';
    const errorLogFileName = 'error.log';
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
            filename: path.join(logDir, errorLogFileName),
            level: 'error',
            format: logger.format.printf(info => `${moment().format('HH:mm:ss.SS')}  ${info.level}\t${info.message}`),
        }),
        new logger.transports.File({
            filename: path.join(logDir, infoLogFileName),
            level: 'debug',
            format: logger.format.printf(info => `${moment().format('HH:mm:ss.SS')}  ${info.level}\t${info.message}`),
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
function validateApp(pack, app) {
    return true;
}
function initializeRoles() {
    let g = new graphlib.Graph();
    for (let role of exports.glob.roles) {
        g.setNode(role._id.toString());
        for (let subRole of role.roles || []) {
            g.setEdge(role._id.toString(), subRole.toString());
        }
    }
    for (let role of exports.glob.roles) {
        let result = graphlib.alg.postorder(g, role._id.toString());
        role.roles = result.map((item) => {
            return new mongodb_1.ObjectId(item);
        });
    }
}
exports.initializeRoles = initializeRoles;
function checkAppMenu(app) {
    if (!app.menu)
        app.menu = exports.glob.menus.find(menu => menu._package == app._package);
    if (!app.menu)
        warn(`Menu for app '${app.title}' not found!`);
}
exports.checkAppMenu = checkAppMenu;
function initializePackages() {
    log(`initializePackages: ${exports.glob.sysConfig.packages.map(p => p.name).join(' , ')}`);
    exports.glob.apps = [];
    for (let pack of getEnabledPackages()) {
        let config = exports.glob.packageConfigs[pack.name];
        for (let app of (config.apps || [])) {
            app._package = pack.name;
            app.dependencies = app.dependencies || [];
            app.dependencies.push(types_1.Constants.sysPackage);
            checkAppMenu(app);
            if (validateApp(pack.name, app)) {
                exports.glob.apps.push(app);
                let host = exports.glob.sysConfig.hosts.find(host => host.app && host.app.equals(app._id));
                if (host)
                    host._app = app;
            }
        }
    }
}
function checkPropertyGtype(prop, entity) {
    if (!prop.type) {
        if (prop.properties && prop.properties.length) {
            prop._gtype = types_1.GlobalType.object;
            return;
        }
        else {
            warn(`property '${entity._package}.${entity.name}.${prop.name}' type is empty!`);
            return;
        }
    }
    switch (prop.type.toString()) {
        case types_1.PType.boolean:
            prop._gtype = types_1.GlobalType.boolean;
            return;
        case types_1.PType.text:
            prop._gtype = types_1.GlobalType.string;
            return;
        case types_1.PType.number:
            prop._gtype = types_1.GlobalType.number;
            return;
        case types_1.PType.location:
            prop._gtype = types_1.GlobalType.location;
            return;
        case types_1.PType.time:
            prop._gtype = types_1.GlobalType.time;
            return;
        case types_1.PType.file:
            prop._gtype = types_1.GlobalType.file;
            return;
        case types_1.PType.reference:
            prop._gtype = types_1.GlobalType.object;
            return;
        case types_1.PType.obj:
            prop._gtype = types_1.GlobalType.object;
            prop.documentView = true;
            return;
    }
    prop._isRef = true;
    prop._enum = findEnum(prop.type);
    if (prop._enum) {
        prop._gtype = types_1.GlobalType.number;
        return;
    }
    let type = findEntity(prop.type);
    if (type == null) {
        prop._gtype = types_1.GlobalType.unknown;
        warn(`Property '${prop.name}' invalid type '${prop.type}' not found. entity: ${entity.name}!`);
        return;
    }
    if (type.entityType == types_1.EntityType.Function) {
        let func = type;
        if (func.returnType && func.returnType.toString() == types_1.PType.text)
            prop._gtype = types_1.GlobalType.string;
        else
            prop._gtype = types_1.GlobalType.id;
    }
    else {
        let refType = prop.referType;
        if (!refType)
            refType = prop.type ? types_1.PropertyReferType.select : types_1.PropertyReferType.inlineData;
        switch (refType) {
            case types_1.PropertyReferType.select:
                prop._gtype = types_1.GlobalType.id;
                break;
            case types_1.PropertyReferType.outbound:
                prop._isRef = false;
                prop._gtype = types_1.GlobalType.object;
                break;
            case types_1.PropertyReferType.inlineData:
                prop._isRef = false;
                prop._gtype = types_1.GlobalType.object;
                break;
        }
    }
}
async function connect(pack, connectionString) {
    if (typeof pack != "string")
        pack = pack.pack;
    if (exports.glob.dbs[pack + ":" + connectionString])
        return exports.glob.dbs[pack + ":" + connectionString];
    connectionString = connectionString || process.env.DB_ADDRESS;
    if (!connectionString)
        throw ("Environment variable 'DB_ADDRESS' is needed.");
    try {
        let dbc = await mongodb_1.MongoClient.connect(connectionString, { useNewUrlParser: true, useUnifiedTopology: true });
        if (!dbc)
            return null;
        return exports.glob.dbs[pack + ":" + connectionString] = dbc.db(pack);
    }
    catch (e) {
        throw `db '${pack}' connection failed [${connectionString}]`;
    }
}
exports.connect = connect;
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
function findObject(pack, objectName) {
    if (typeof pack != "string")
        pack = pack.pack;
    return exports.glob.entities.find(a => a._package == pack && a.name == objectName && a.entityType == types_1.EntityType.Object);
}
exports.findObject = findObject;
async function initializeEnums() {
    log('initializeEnums ...');
    exports.glob.enums = [];
    exports.glob.enumTexts = {};
    for (let pack of getEnabledPackages()) {
        let enums = await get(pack.name, types_1.SysCollection.enums, { rawData: true });
        enums.forEach((theEnum) => {
            theEnum._package = pack.name;
            exports.glob.enums.push(theEnum);
            let texts = {};
            _.sortBy(theEnum.items, "_z").forEach((item) => {
                texts[item.value] = item.title || item.name;
            });
            exports.glob.enumTexts[pack.name + "." + theEnum.name] = texts;
        });
    }
}
exports.initializeEnums = initializeEnums;
function allObjects() {
    return exports.glob.entities.filter(en => en.entityType == types_1.EntityType.Object);
}
exports.allObjects = allObjects;
function allFunctions() {
    return exports.glob.entities.filter(en => en.entityType == types_1.EntityType.Function);
}
exports.allFunctions = allFunctions;
async function initializeEntities() {
    log(`Initializing '${allObjects().length}' Objects ...`);
    let allObjs = allObjects();
    for (let obj of allObjs) {
        obj._inited = false;
    }
    for (let obj of allObjs) {
        initObject(obj);
    }
    for (let pack of getEnabledPackages()) {
        let config = exports.glob.packageConfigs[pack.name];
        let obj = findObject(pack.name, types_1.SysCollection.packageConfig);
        await makeObjectReady(pack.name, obj.properties, config);
    }
    log(`Initializing '${allFunctions().length}' functions ...`);
    for (let func of allFunctions()) {
        try {
            func._access = {};
            func._access[func._package] = func.access;
            initProperties(func.parameters, func, func.title);
        }
        catch (ex) {
            error("Init functions, Module: " + func._package + ", Action: " + func.name, ex);
        }
    }
}
function checkFileProperty(prop, entity) {
    if (prop._gtype == types_1.GlobalType.file) {
        if (prop.file && prop.file.drive) {
            prop.file.drive = exports.glob.drives.find(d => d._id.equals(prop.file.drive));
            if (!prop.file.drive)
                error(`drive for property file '${entity._package}.${entity.name}.${prop.name}' not found.`);
        }
        else if (entity.entityType == types_1.EntityType.Object)
            error(`drive for property file '${entity._package}.${entity.name}.${prop.name}' must be set.`);
    }
}
function checkForSystemProperty(prop) {
    if (!prop.type && !prop.properties) {
        let sysProperty = exports.glob.systemProperties.find(p => p.name === prop.name);
        if (sysProperty)
            _.defaultsDeep(prop, sysProperty);
    }
}
function initProperties(properties, entity, parentTitle) {
    if (!properties)
        return;
    for (let prop of properties) {
        checkForSystemProperty(prop);
        prop.group = prop.group || parentTitle;
        checkPropertyGtype(prop, entity);
        checkFileProperty(prop, entity);
        initProperties(prop.properties, entity, prop.title);
    }
}
exports.initProperties = initProperties;
function initObject(obj) {
    try {
        if (obj._inited)
            return;
        else
            obj._inited = true;
        obj.properties = obj.properties || [];
        obj._autoSetInsertTime = _.some(obj.properties, { name: types_1.SystemProperty.time });
        obj._access = {};
        obj._access[obj._package] = obj.access;
        initProperties(obj.properties, obj);
        if (obj.reference) {
            let referenceObj = findEntity(obj.reference);
            if (!referenceObj)
                return warn(`SimilarObject in service '${obj._package}' not found for object: '${obj.title}', SimilarObjectID:${obj.reference}`);
            initObject(referenceObj);
            _.defaultsDeep(obj, referenceObj);
            compareParentProperties(obj.properties, referenceObj.properties, obj);
        }
        else if (obj.properties) {
            for (let prop of obj.properties) {
                checkPropertyReference(prop, obj);
            }
        }
    }
    catch (ex) {
        error(`initObject, Error in object ${obj._package}.${obj.name}`, ex);
    }
}
exports.initObject = initObject;
function checkPropertyReference(property, entity) {
    if (property._gtype == types_1.GlobalType.object && (!property.properties || !property.properties.length)) {
        let propertyParentObject = findEntity(property.type);
        if (!propertyParentObject) {
            if (property._gtype == types_1.GlobalType.object)
                return;
            return error(`Property '${entity._package}.${entity.name}.${property.name}' type '${property.type}' not found.`);
        }
        initObject(propertyParentObject);
        property.properties = property.properties || [];
        if (!property._parentPropertiesCompared) {
            property._parentPropertiesCompared = true;
            compareParentProperties(property.properties, propertyParentObject.properties, entity);
        }
    }
    else if (property.properties)
        for (let prop of property.properties) {
            checkPropertyReference(prop, entity);
        }
}
function compareParentProperties(properties, parentProperties, entity) {
    if (!parentProperties)
        return;
    let parentNames = parentProperties.map(p => p.name);
    properties.filter(p => parentNames.indexOf(p.name) == -1).forEach(newProperty => checkPropertyReference(newProperty, entity));
    for (let parentProperty of parentProperties) {
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
                    error(`(HandleSimilarProperty) Object '${property.type}' not found as property ${property.title} reference.`);
                    continue;
                }
                if (!propertyParentObject._inited)
                    initObject(propertyParentObject);
                if (!property._parentPropertiesCompared) {
                    property._parentPropertiesCompared = true;
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
            if (!property._parentPropertiesCompared) {
                property._parentPropertiesCompared = true;
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
function getText(cn, text, useDictionary) {
    if (cn == null || !cn.locale)
        return (text || "").toString();
    if (!text)
        return "";
    if (typeof text == "string" && useDictionary)
        text = exports.glob.dictionary[cn.pack + "." + text] || exports.glob.dictionary["sys." + text] || text;
    if (typeof text == "string")
        return text;
    let localeName = types_1.Locale[cn.locale];
    if (text[localeName])
        return text[localeName];
    else
        return _.values(text)[0];
}
exports.getText = getText;
function getEnumText(thePackage, dependencies, enumType, value, locale) {
    if (value == null)
        return "";
    let theEnum = getEnumByName(thePackage, dependencies, enumType);
    if (!theEnum)
        return value;
    let text = theEnum[value];
    return getText({ locale }, text);
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
function getEnumByName(thePackage, dependencies, enumType) {
    let theEnum = exports.glob.enumTexts[thePackage + "." + enumType];
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
function getPackageConfig(pack) {
    let config = exports.glob.packageConfigs[pack];
    if (!config)
        throw `config for package '${pack}' not found.`;
    config._static = require(path.join(process.env.PACKAGES_ROOT, pack, `package.json`));
    return config;
}
exports.getPackageConfig = getPackageConfig;
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
    for (let key in obj) {
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
    else if (value && value.toString().indexOf("__ObjectID ") == 0) {
        return new mongodb_1.ObjectId(value.split("__ObjectID ")[1]);
    }
    else
        return value;
}
exports.jsonReviver = jsonReviver;
function jsonReplacer(key, value) {
    if (value instanceof RegExp) {
        return ("__REGEXP " + value.toString());
    }
    else if (value instanceof mongodb_1.ObjectId) {
        return ("__ObjectID " + value.toString());
    }
    else
        return value;
}
exports.jsonReplacer = jsonReplacer;
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
    let objects = allObjects().map((ent) => {
        let title = getText(cn, ent.title) + (cn.pack == ent._package ? "" : " (" + ent._package + ")");
        return Object.assign(Object.assign({}, ent), { title });
    });
    let functions = allFunctions().map((ent) => {
        let title = getText(cn, ent.title) + (cn.pack == ent._package ? "" : " (" + ent._package + ")");
        return Object.assign(Object.assign({}, ent), { title });
    });
    let enums = exports.glob.enums.map((ent) => {
        let title = getText(cn, ent.title) + (cn.pack == ent._package ? "" : " (" + ent._package + ")");
        return Object.assign(Object.assign({}, ent), { title });
    });
    let types = objects.concat(functions, enums);
    types = _.orderBy(types, ['title']);
    let ptypes = [];
    for (let type in types_1.PType) {
        ptypes.push({ _id: new mongodb_1.ObjectId(types_1.PType[type]), title: getText(cn, type, true) });
    }
    types.unshift({ _id: null, title: "-" });
    types = ptypes.concat(types);
    return types;
}
exports.getTypes = getTypes;
async function getAllEntities(cn) {
    let entities = exports.glob.entities.map(ent => {
        let title = getText(cn, ent.title) + (cn.pack == ent._package ? "" : " (" + ent._package + ")");
        return Object.assign(Object.assign({}, ent), { title });
    });
    entities = _.orderBy(entities, ['title']);
    return entities;
}
exports.getAllEntities = getAllEntities;
async function getDataEntities(cn) {
    let entities = exports.glob.entities.filter(e => e.entityType == types_1.EntityType.Function || e.entityType == types_1.EntityType.Object).map(ent => {
        let title = getText(cn, ent.title) + (cn.pack == ent._package ? "" : " (" + ent._package + ")");
        return Object.assign(Object.assign({}, ent), { title });
    });
    entities = _.orderBy(entities, ['title']);
    return entities;
}
exports.getDataEntities = getDataEntities;
function json2bson(doc) {
    return EJSON.deserialize(doc);
}
exports.json2bson = json2bson;
function bson2json(doc) {
    return EJSON.serialize(doc);
}
exports.bson2json = bson2json;
function stringify(value) {
    value._0 = "";
    const getCircularReplacer = () => {
        const seen = new WeakSet();
        return (key, value) => {
            if (typeof value === "object" && value !== null) {
                if (seen.has(value)) {
                    return { _$: value._0 };
                }
                for (let attr in value) {
                    let val = value[attr];
                    if (val) {
                        if (val.constructor == mongodb_1.ObjectId)
                            value[attr] = { "$oid": val.toString() };
                        if (val instanceof Date)
                            value[attr] = { "$date": val.toString() };
                    }
                }
                seen.add(value);
            }
            return value;
        };
    };
    const seen = new WeakSet();
    const setKeys = (obj, parentKey) => {
        if (seen.has(obj))
            return;
        seen.add(obj);
        for (let key in obj) {
            let val = obj[key];
            if (!val)
                continue;
            if (typeof val === "object" && val.constructor != mongodb_1.ObjectId) {
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
exports.stringify = stringify;
function parse(str) {
    let json = typeof str == "string" ? JSON.parse(str) : str;
    let keys = {};
    const findKeys = (obj) => {
        if (obj && obj._0) {
            keys[obj._0] = obj;
            delete obj._0;
        }
        for (let key in obj) {
            if (typeof obj[key] === "object")
                findKeys(obj[key]);
        }
    };
    const seen = new WeakSet();
    const replaceRef = (obj) => {
        if (seen.has(obj))
            return;
        seen.add(obj);
        for (let key in obj) {
            let val = obj[key];
            if (!val)
                continue;
            if (typeof val === "object") {
                if (val.$oid) {
                    obj[key] = new mongodb_1.ObjectId(val.$oid);
                    continue;
                }
                if (val.$date) {
                    obj[key] = new Date(val.$date);
                    continue;
                }
                if (val._$ == "") {
                    obj[key] = json;
                }
                else if (val._$) {
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
exports.parse = parse;
async function getPropertyReferenceValues(cn, prop, instance) {
    if (prop._enum) {
        let items = _.map(prop._enum.items, (item) => {
            return { ref: item.value, title: getText(cn, item.title) };
        });
        return items;
    }
    let entity = findEntity(prop.type);
    if (!entity) {
        error(`Property '${prop.name}' type '${prop.type}' not found.`);
        throw types_1.StatusCode.NotFound;
    }
    if (entity.entityType == types_1.EntityType.Object) {
        let result = await get(cn.pack, entity.name, { count: 10, rawData: true });
        if (result) {
            return _.map(result, (item) => {
                return { ref: item._id, title: getText(cn, item.title) };
            });
        }
        else
            return null;
    }
    else if (entity.entityType === types_1.EntityType.Function) {
        let typeFunc = entity;
        let args = [];
        if (typeFunc.parameters)
            for (let param of typeFunc.parameters) {
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
        return await invoke(cn, typeFunc, args);
    }
}
exports.getPropertyReferenceValues = getPropertyReferenceValues;
function envMode() {
    switch (process.env.NODE_ENV) {
        case "production":
            return types_1.EnvMode.Production;
        case "development":
        default:
            return types_1.EnvMode.Development;
    }
}
exports.envMode = envMode;
function mockCheckMatchInput(cn, func, args, sample) {
    for (let key in sample.input) {
        if (!_.isEqual(sample.input[key], cn.req[key]))
            return false;
    }
    return true;
}
async function mock(cn, func, args) {
    log(`mocking function '${cn.pack}.${func.name}' ...`);
    if (!func.test.samples || !func.test.samples.length)
        return { code: types_1.StatusCode.Ok, message: "No sample data!" };
    let withInputs = func.test.samples.filter((sample) => {
        return sample.input;
    });
    for (let sample of withInputs) {
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
    if (func.parameters) {
        const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
        const ARGUMENT_NAMES = /([^\s,]+)/g;
        let fnStr = action.toString().replace(STRIP_COMMENTS, '');
        let argNames = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);
        if (argNames === null)
            argNames = [];
        if (argNames[0] == "cn")
            argNames.shift();
        let argData = {};
        argNames.forEach((argName, i) => {
            argData[argName] = args[i];
        });
        await makeObjectReady(cn, func.parameters, argData);
        args = Object.values(argData);
    }
    return args;
}
async function invoke(cn, func, args) {
    if (func.test && func.test.mock && envMode() == types_1.EnvMode.Development && cn.url.pathname != "/functionTest") {
        return await mock(cn, func, args);
    }
    let action = require(path.join(process.env.PACKAGES_ROOT, func._package, `src/main`))[func.name];
    if (!action) {
        if (func._package == types_1.Constants.sysPackage)
            action = require(path.join(process.env.PACKAGES_ROOT, `web/src/main`))[func.name];
        if (!action) {
            let app = exports.glob.apps.find(app => app._package == cn.pack);
            for (let pack of app.dependencies) {
                action = require(path.join(process.env.PACKAGES_ROOT, pack, `src/main`))[func.name];
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
async function runFunction(cn, functionId, input) {
    let func = findEntity(functionId);
    if (!func)
        throw types_1.StatusCode.NotFound;
    input = input || {};
    let args = [];
    if (func.parameters)
        for (let para of func.parameters) {
            args.push(input[para.name]);
        }
    return invoke(cn, func, args);
}
exports.runFunction = runFunction;
function isObjectId(value) {
    if (!value)
        return false;
    return value._bsontype == "ObjectID";
}
exports.isObjectId = isObjectId;
function throwError(code, message) {
    throw new types_1.ErrorObject(code, message);
}
exports.throwError = throwError;
function getReference(id) {
    return new mongodb_1.ObjectId(id);
}
exports.getReference = getReference;
function clientLog(cn, message, type = types_1.LogType.Debug, ref) {
    logger.log(types_1.LogType[type].toLowerCase(), message);
    exports.postClientCommandCallback(cn, types_1.ClientCommand.Log, message, type, ref);
}
exports.clientLog = clientLog;
function clientCommand(cn, command, ...args) {
    exports.postClientCommandCallback(cn, command, ...args);
}
exports.clientCommand = clientCommand;
async function removeDir(dir) {
    return new Promise((resolve, reject) => {
        rimraf(dir, { silent: true }, (ex) => {
            if (ex)
                reject(ex);
            else
                resolve();
        });
    });
}
exports.removeDir = removeDir;
async function clientQuestion(cn, message, optionsEnum) {
    return new Promise(resolve => {
        let items = getEnumItems(cn, optionsEnum);
        let waitFn = (answer) => resolve(answer);
        let questionID = new mongodb_1.ObjectId().toString();
        exports.glob.clientQuestionCallbacks[cn["httpReq"].session.id + ":" + questionID] = waitFn;
        exports.postClientCommandCallback(cn, types_1.ClientCommand.Question, questionID, message, items);
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
    exports.postClientCommandCallback(cn, types_1.ClientCommand.Notification, title, message, url, icon);
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
//# sourceMappingURL=main.js.map