"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
Object.defineProperty(exports, "__esModule", { value: true });
var logger = require("winston");
var mongodb = require("mongodb");
var _ = require("lodash");
var xmlBuilder = require("xmlbuilder");
var fs = require("fs-extra");
var path = require("path");
var moment = require("moment");
var graphlib = require("graphlib");
var Jalali = require("jalali-moment");
var AWS = require("aws-sdk");
var mongodb_1 = require("mongodb");
var types_1 = require("./types");
var EJSON = require('bson').EJSON;
exports.glob = new types_1.Global();
function reload(cn) {
    return __awaiter(this, void 0, void 0, function () {
        var startTime, period;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    startTime = moment();
                    log("reload ...");
                    return [4, loadSysConfig()];
                case 1:
                    _a.sent();
                    return [4, loadSystemCollections()];
                case 2:
                    _a.sent();
                    return [4, loadGeneralCollections()];
                case 3:
                    _a.sent();
                    return [4, loadAuditTypes()];
                case 4:
                    _a.sent();
                    return [4, initializeEnums()];
                case 5:
                    _a.sent();
                    return [4, initializePackages()];
                case 6:
                    _a.sent();
                    return [4, initializeRoles()];
                case 7:
                    _a.sent();
                    return [4, initializeEntities()];
                case 8:
                    _a.sent();
                    period = moment().diff(startTime, 'ms', true);
                    info("reload done in '" + period + "' ms.");
                    return [2];
            }
        });
    });
}
exports.reload = reload;
function start() {
    return __awaiter(this, void 0, void 0, function () {
        var ex_1;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    process.on('uncaughtException', function (err) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4, audit(types_1.SysAuditTypes.uncaughtException, { level: types_1.LogLevel.Emerg, comment: err.message + ". " + err.stack })];
                            case 1: return [2, _a.sent()];
                        }
                    }); }); });
                    process.on('unhandledRejection', function (err) { return __awaiter(_this, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4, audit(types_1.SysAuditTypes.unhandledRejection, {
                                        level: types_1.LogLevel.Emerg,
                                        comment: err.message + ". " + err.stack
                                    })];
                                case 1:
                                    _a.sent();
                                    return [2];
                            }
                        });
                    }); });
                    require('source-map-support').install({ handleUncaughtExceptions: true });
                    configureLogger(false);
                    return [4, reload()];
                case 1:
                    _a.sent();
                    return [2, exports.glob];
                case 2:
                    ex_1 = _a.sent();
                    exception(ex_1);
                    return [2, null];
                case 3: return [2];
            }
        });
    });
}
exports.start = start;
function isWindows() {
    return /^win/.test(process.platform);
}
function audit(auditType, args) {
    return __awaiter(this, void 0, void 0, function () {
        var comment, type, msg;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    args.type = args.type || new mongodb_1.ObjectId(auditType);
                    args.time = new Date();
                    comment = args.comment || "";
                    type = _.find(exports.glob.auditTypes, function (type) {
                        return type._id.equals(args.type);
                    });
                    msg = "audit(" + (type ? type.name : args.type) + "): " + comment;
                    switch (args.level) {
                        case types_1.LogLevel.Emerg:
                            emerg(msg);
                            break;
                        case types_1.LogLevel.Error:
                            error(msg);
                            break;
                        case types_1.LogLevel.Notice:
                            notice(msg);
                            break;
                        case types_1.LogLevel.Info:
                            info(msg);
                            break;
                        case types_1.LogLevel.Warning:
                            warn(msg);
                            break;
                    }
                    if (type && type.disabled)
                        return [2];
                    return [4, put(args.pack || types_1.Constants.sysPackage, types_1.SysCollection.audits, args)];
                case 1:
                    _a.sent();
                    return [2];
            }
        });
    });
}
exports.audit = audit;
function run(cn, func) {
    var args = [];
    for (var _i = 2; _i < arguments.length; _i++) {
        args[_i - 2] = arguments[_i];
    }
    try {
        var theFunction = eval(_.camelCase(func));
        theFunction.apply(void 0, __spreadArrays([cn], args));
    }
    catch (err) {
        warn("[exe] " + func);
    }
}
exports.run = run;
function get(pack, objectName, options) {
    return __awaiter(this, void 0, void 0, function () {
        var collection, find, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4, getCollection(pack, objectName)];
                case 1:
                    collection = _a.sent();
                    options = options || {};
                    if (!options.itemId) return [3, 2];
                    return [2, collection.findOne(options.itemId)];
                case 2:
                    find = collection.find(options.query);
                    if (options.sort)
                        find = find.sort(options.sort);
                    if (options.last)
                        find = find.sort({ $natural: -1 });
                    if (options.count)
                        find = find.limit(options.count);
                    if (!options.skip) return [3, 4];
                    return [4, find.skip(options.skip)];
                case 3:
                    find = _a.sent();
                    _a.label = 4;
                case 4: return [4, find.toArray()];
                case 5:
                    result = _a.sent();
                    if (options.count === 1 && result)
                        return [2, result[0]];
                    else
                        return [2, result];
                    _a.label = 6;
                case 6: return [2];
            }
        });
    });
}
exports.get = get;
function getCollection(pack, objectName) {
    return __awaiter(this, void 0, void 0, function () {
        var db;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4, connect(pack)];
                case 1:
                    db = _a.sent();
                    return [2, db.collection(objectName)];
            }
        });
    });
}
function put(pack, objectName, item, options) {
    return __awaiter(this, void 0, void 0, function () {
        var collection, portions, _a, command, rootId, pth;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4, getCollection(pack, objectName)];
                case 1:
                    collection = _b.sent();
                    item = item || {};
                    if (!(!options || !options.portions || options.portions.length == 1)) return [3, 5];
                    if (!item._id) return [3, 3];
                    return [4, collection.replaceOne({ _id: item._id }, item)];
                case 2:
                    _b.sent();
                    return [2, {
                            type: types_1.ObjectModifyType.Update,
                            item: item,
                            itemId: item._id
                        }];
                case 3: return [4, collection.insertOne(item)];
                case 4:
                    _b.sent();
                    return [2, {
                            type: types_1.ObjectModifyType.Insert,
                            item: item,
                            itemId: item._id
                        }];
                case 5:
                    portions = options.portions;
                    _a = portions.length;
                    switch (_a) {
                        case 2: return [3, 6];
                    }
                    return [3, 8];
                case 6: return [4, collection.save(item)];
                case 7:
                    _b.sent();
                    return [2, ({
                            type: types_1.ObjectModifyType.Update,
                            item: item,
                            itemId: item._id
                        })];
                case 8:
                    command = { $addToSet: {} };
                    item._id = item._id || new mongodb_1.ObjectId();
                    rootId = portions[1].itemId;
                    return [4, portionsToMongoPath(pack, rootId, portions, portions.length)];
                case 9:
                    pth = _b.sent();
                    command.$addToSet[pth] = item;
                    return [4, collection.updateOne({ _id: rootId }, command)];
                case 10:
                    _b.sent();
                    return [2, {
                            type: types_1.ObjectModifyType.Patch,
                            item: item,
                            itemId: rootId
                        }];
            }
        });
    });
}
exports.put = put;
function portionsToMongoPath(pack, rootId, portions, endIndex) {
    return __awaiter(this, void 0, void 0, function () {
        var collection, value, path, _loop_1, i;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (endIndex == 3)
                        return [2, portions[2].property.name];
                    collection = exports.glob.dbs[pack].collection(portions[0].value);
                    if (!collection)
                        throw types_1.StatusCode.BadRequest;
                    return [4, collection.findOne({ _id: rootId })];
                case 1:
                    value = _a.sent();
                    if (!value)
                        throw types_1.StatusCode.ServerError;
                    path = "";
                    _loop_1 = function (i) {
                        var part = portions[i].value;
                        if (portions[i].type == types_1.RefPortionType.property) {
                            path += "." + part;
                            value = value[part];
                            if (value == null)
                                value = {};
                        }
                        else {
                            var partItem = _.find(value, function (it) {
                                return it._id && it._id.toString() == part;
                            });
                            if (!partItem)
                                throw types_1.StatusCode.ServerError;
                            path += "." + value.indexOf(partItem);
                            value = partItem;
                        }
                    };
                    for (i = 2; i < endIndex; i++) {
                        _loop_1(i);
                    }
                    return [2, _.trim(path, '.')];
            }
        });
    });
}
exports.portionsToMongoPath = portionsToMongoPath;
function count(pack, objectName, options) {
    return __awaiter(this, void 0, void 0, function () {
        var collection;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4, getCollection(pack, objectName)];
                case 1:
                    collection = _a.sent();
                    options = options || {};
                    return [4, collection.countDocuments(options)];
                case 2: return [2, _a.sent()];
            }
        });
    });
}
exports.count = count;
function extractRefPortions(pack, appDependencies, ref, _default) {
    try {
        ref = _.trim(ref, '/') || _default;
        if (!ref)
            return null;
        var portions_1 = _.map(ref.split('/'), function (portion) {
            return { value: portion };
        });
        if (portions_1.length === 0)
            return null;
        for (var i = 1; i < portions_1.length; i++) {
            portions_1[i].pre = portions_1[i - 1];
        }
        var entity = _.find(exports.glob.entities, function (entity) {
            return entity._id.toString() === portions_1[0].value;
        });
        if (!entity)
            entity = _.find(exports.glob.entities, { _package: pack, name: portions_1[0].value });
        if (!entity)
            entity = _.find(exports.glob.entities, function (entity) {
                return entity.name === portions_1[0].value && appDependencies.indexOf(entity._package) > -1;
            });
        if (entity) {
            portions_1[0].entity = entity;
            portions_1[0].type = types_1.RefPortionType.entity;
        }
        else
            return null;
        if (entity.entityType !== types_1.EntityType.Object || portions_1.length < 2)
            return portions_1;
        var parent_1 = entity;
        for (var i = 1; i < portions_1.length; i++) {
            var pr = portions_1[i];
            if (parent_1 == null) {
                warn("Invalid path '" + ref + "'");
                return null;
            }
            else if (parent_1._gtype == types_1.GlobalType.file) {
                pr.type = types_1.RefPortionType.file;
            }
            else if ((parent_1.entityType || parent_1.isList) && /[0-9a-f]{24}/.test(pr.value)) {
                pr.type = types_1.RefPortionType.item;
                var itemId = pr.value;
                pr.itemId = new mongodb_1.ObjectId(itemId);
            }
            else {
                pr.type = types_1.RefPortionType.property;
                parent_1 = pr.property = _.find(parent_1.properties, { name: pr.value });
                if (!pr.property)
                    error("Invalid property name '" + pr.value + "' in path '" + ref + "'");
            }
        }
        return portions_1;
    }
    catch (ex) {
        exception(ex);
    }
}
exports.extractRefPortions = extractRefPortions;
function patch(pack, objectName, patchData, options) {
    return __awaiter(this, void 0, void 0, function () {
        var collection, portions, theRootId, path, command, key, rootId, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    collection = exports.glob.dbs[pack].collection(objectName);
                    if (!collection)
                        throw types_1.StatusCode.BadRequest;
                    if (!options)
                        options = { portions: [] };
                    portions = options.portions;
                    if (!portions)
                        portions = [{ type: types_1.RefPortionType.entity, value: objectName }];
                    if (portions.length == 1)
                        throw types_1.StatusCode.BadRequest;
                    theRootId = portions.length < 2 ? patchData._id : portions[1].itemId;
                    return [4, portionsToMongoPath(pack, theRootId, portions, portions.length)];
                case 1:
                    path = _a.sent();
                    command = { $set: {}, $unset: {} };
                    if (portions[portions.length - 1].property && portions[portions.length - 1].property._gtype == types_1.GlobalType.file)
                        command["$set"][path] = patchData;
                    else
                        for (key in patchData) {
                            if (key == "_id")
                                continue;
                            command[patchData[key] == null ? "$unset" : "$set"][path + (path ? "." : "") + key] = patchData[key];
                        }
                    if (_.isEmpty(command.$unset))
                        delete command.$unset;
                    if (_.isEmpty(command.$set))
                        delete command.$set;
                    rootId = portions[1].itemId;
                    return [4, collection.updateOne({ _id: rootId }, command)];
                case 2:
                    result = _a.sent();
                    return [2, {
                            type: types_1.ObjectModifyType.Patch,
                            item: patchData,
                            itemId: rootId
                        }];
            }
        });
    });
}
exports.patch = patch;
function del(pack, objectName, options) {
    return __awaiter(this, void 0, void 0, function () {
        var collection, result, portions, _a, command, rootId, itemId, path_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    collection = exports.glob.dbs[pack].collection(objectName);
                    if (!collection || !options)
                        throw types_1.StatusCode.BadRequest;
                    if (!options.itemId) return [3, 2];
                    return [4, collection.deleteOne({ _id: options.itemId })];
                case 1:
                    result = _b.sent();
                    return [2, {
                            type: types_1.ObjectModifyType.Delete,
                            item: null,
                            itemId: options.itemId
                        }];
                case 2:
                    portions = options.portions;
                    if (portions.length == 1 || portions.length == 3)
                        throw types_1.StatusCode.BadRequest;
                    _a = portions.length;
                    switch (_a) {
                        case 2: return [3, 3];
                    }
                    return [3, 5];
                case 3: return [4, collection.deleteOne({ _id: portions[1].itemId })];
                case 4:
                    _b.sent();
                    return [2, {
                            type: types_1.ObjectModifyType.Delete,
                            item: null,
                            itemId: portions[1].itemId
                        }];
                case 5:
                    command = { $pull: {} };
                    rootId = portions[1].itemId;
                    itemId = portions[portions.length - 1].itemId;
                    return [4, portionsToMongoPath(pack, rootId, portions, portions.length - 1)];
                case 6:
                    path_1 = _b.sent();
                    command.$pull[path_1] = { _id: itemId };
                    return [4, collection.updateOne({ _id: rootId }, command)];
                case 7:
                    _b.sent();
                    return [2, {
                            type: types_1.ObjectModifyType.Patch,
                            item: null,
                            itemId: rootId
                        }];
            }
        });
    });
}
exports.del = del;
function getFile(drive, filePath) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, _path, file, db, bucket, stream, data_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = drive.type;
                    switch (_a) {
                        case types_1.SourceType.File: return [3, 1];
                        case types_1.SourceType.Db: return [3, 3];
                    }
                    return [3, 4];
                case 1:
                    _path = path.join(drive.address, filePath);
                    return [4, fs.readFile(_path)];
                case 2:
                    file = _b.sent();
                    if (!file)
                        throw types_1.StatusCode.NotFound;
                    return [3, 5];
                case 3:
                    db = exports.glob.dbs[drive._package];
                    bucket = new mongodb.GridFSBucket(db);
                    stream = bucket.openDownloadStreamByName(filePath);
                    stream.on("end", function () {
                        return data_1;
                    }).on("data", function (chunk) {
                        data_1 = data_1 ? Buffer.concat([data_1, chunk]) : chunk;
                    }).on("error", function (err) {
                        error(err);
                        throw types_1.StatusCode.NotFound;
                    });
                    return [3, 5];
                case 4: throw types_1.StatusCode.NotImplemented;
                case 5: return [2];
            }
        });
    });
}
exports.getFile = getFile;
function putFile(host, drive, filePath, file) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, _path, db, bucket, stream, s3, data;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = drive.type;
                    switch (_a) {
                        case types_1.SourceType.File: return [3, 1];
                        case types_1.SourceType.Db: return [3, 4];
                        case types_1.SourceType.S3: return [3, 6];
                    }
                    return [3, 8];
                case 1:
                    _path = path.join(drive.address, filePath);
                    return [4, fs.mkdir(path.dirname(_path), { recursive: true })];
                case 2:
                    _b.sent();
                    return [4, fs.writeFile(_path, file)];
                case 3:
                    _b.sent();
                    return [3, 9];
                case 4:
                    db = exports.glob.dbs[host];
                    bucket = new mongodb.GridFSBucket(db);
                    stream = bucket.openUploadStream(filePath);
                    return [4, delFile(host, filePath)];
                case 5:
                    _b.sent();
                    stream.on("error", function (err) {
                        error(err);
                    }).end(file);
                    return [3, 9];
                case 6:
                    if (!exports.glob.sysConfig.amazon || !exports.glob.sysConfig.amazon.accessKeyId) {
                        error('s3 accessKeyId, secretAccessKey is required in sysConfig!');
                        throw types_1.StatusCode.SystemConfigurationProblem;
                    }
                    AWS.config.accessKeyId = exports.glob.sysConfig.amazon.accessKeyId;
                    AWS.config.secretAccessKey = exports.glob.sysConfig.amazon.secretAccessKey;
                    s3 = new AWS.S3({ apiVersion: types_1.Constants.amazonS3ApiVersion });
                    return [4, s3.upload({ Bucket: drive.address, Key: path.basename(filePath), Body: file })];
                case 7:
                    data = _b.sent();
                    return [2, { url: data.Location }];
                case 8: throw types_1.StatusCode.NotImplemented;
                case 9: return [2];
            }
        });
    });
}
exports.putFile = putFile;
function getFileInfo(host, filePath) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2];
        });
    });
}
exports.getFileInfo = getFileInfo;
function delFile(host, filePath) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2];
        });
    });
}
exports.delFile = delFile;
function movFile(host, sourcePath, targetPath) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2];
        });
    });
}
exports.movFile = movFile;
function authorizeUser(email, password, done) {
}
exports.authorizeUser = authorizeUser;
function silly() {
    var message = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        message[_i] = arguments[_i];
    }
    logger.silly(message);
}
exports.silly = silly;
function log() {
    var message = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        message[_i] = arguments[_i];
    }
    logger.debug(message);
}
exports.log = log;
function info() {
    var message = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        message[_i] = arguments[_i];
    }
    logger.info(message);
}
exports.info = info;
function notice(message) {
    logger.log('notice', message);
}
exports.notice = notice;
function warn() {
    var message = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        message[_i] = arguments[_i];
    }
    logger.warn(message);
}
exports.warn = warn;
function error() {
    var message = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        message[_i] = arguments[_i];
    }
    logger.error(message);
}
exports.error = error;
function todo(message) {
    logger.log('todo', '#ToDo: ' + message);
}
exports.todo = todo;
function exception(err) {
    logger.log("crit", err.stack || err.message || err);
}
exports.exception = exception;
function emerg(message) {
    logger.log('emerg', message);
    logger.error("terminating process ...");
    setTimeout(function () {
        process.exit();
    }, 2000);
}
exports.emerg = emerg;
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
function loadGeneralCollections() {
    return __awaiter(this, void 0, void 0, function () {
        var _a, result;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    log('loadGeneralCollections ...');
                    _a = exports.glob;
                    return [4, get(types_1.Constants.sysPackage, types_1.Constants.timeZonesCollection)];
                case 1:
                    _a.timeZones = _b.sent();
                    return [4, get(types_1.Constants.sysPackage, types_1.SysCollection.objects, {
                            query: { name: types_1.Constants.systemPropertiesObjectName },
                            count: 1
                        })];
                case 2:
                    result = _b.sent();
                    if (!result)
                        emerg('systemProperties object not found!');
                    exports.glob.systemProperties = result ? result.properties : [];
                    return [2];
            }
        });
    });
}
function loadAuditTypes() {
    return __awaiter(this, void 0, void 0, function () {
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    log('loadAuditTypes ...');
                    _a = exports.glob;
                    return [4, get(types_1.Constants.sysPackage, types_1.SysCollection.auditTypes)];
                case 1:
                    _a.auditTypes = _b.sent();
                    return [2];
            }
        });
    });
}
function getEnabledPackages() {
    return exports.glob.sysConfig.packages.filter(function (pack) { return pack.enabled; });
}
function loadSysConfig() {
    return __awaiter(this, void 0, void 0, function () {
        var _a, _i, _b, pack, p;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _a = exports.glob;
                    return [4, get(types_1.Constants.sysPackage, types_1.SysCollection.systemConfig, { count: 1 })];
                case 1:
                    _a.sysConfig = _c.sent();
                    for (_i = 0, _b = getEnabledPackages(); _i < _b.length; _i++) {
                        pack = _b[_i];
                        try {
                            exports.glob.packages[pack.name] = require(path.join(process.env.PACKAGES_ROOT, pack.name, "src/main"));
                            if (exports.glob.packages[pack.name] == null)
                                error("Error loading package " + pack.name + "!");
                            else {
                                p = require(path.join(process.env.PACKAGES_ROOT, pack.name, "package.json"));
                                exports.glob.packages[pack.name]._version = p.version;
                                log("package '" + pack.name + "' loaded. version: " + p.version);
                            }
                        }
                        catch (ex) {
                            exception(ex);
                            pack.enabled = false;
                        }
                    }
                    return [2];
            }
        });
    });
}
function loadPackageSystemCollections(packConfig) {
    return __awaiter(this, void 0, void 0, function () {
        var pack, config, objects, _i, objects_1, object, functions, _a, functions_1, func, views, _b, views_1, view, texts, _c, texts_1, item, menus, _d, menus_1, menu, roles, _e, roles_1, role, drives, _f, drives_1, drive;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0:
                    pack = packConfig.name;
                    log("Loading system collections package '" + pack + "' ...");
                    return [4, get(pack, types_1.SysCollection.configs, { count: 1 })];
                case 1:
                    config = _g.sent();
                    if (!config) {
                        packConfig.enabled = false;
                        error("Config for package '" + pack + "' not found!");
                    }
                    else
                        exports.glob.packages[pack]._config = config;
                    return [4, get(pack, types_1.SysCollection.objects)];
                case 2:
                    objects = _g.sent();
                    for (_i = 0, objects_1 = objects; _i < objects_1.length; _i++) {
                        object = objects_1[_i];
                        object._package = pack;
                        object.entityType = types_1.EntityType.Object;
                        exports.glob.entities.push(object);
                    }
                    return [4, get(pack, types_1.SysCollection.functions)];
                case 3:
                    functions = _g.sent();
                    for (_a = 0, functions_1 = functions; _a < functions_1.length; _a++) {
                        func = functions_1[_a];
                        func._package = pack;
                        func.entityType = types_1.EntityType.Function;
                        exports.glob.entities.push(func);
                    }
                    return [4, get(pack, types_1.SysCollection.views)];
                case 4:
                    views = _g.sent();
                    for (_b = 0, views_1 = views; _b < views_1.length; _b++) {
                        view = views_1[_b];
                        view._package = pack;
                        view.entityType = types_1.EntityType.View;
                        exports.glob.entities.push(view);
                    }
                    return [4, get(pack, types_1.SysCollection.dictionary)];
                case 5:
                    texts = _g.sent();
                    for (_c = 0, texts_1 = texts; _c < texts_1.length; _c++) {
                        item = texts_1[_c];
                        exports.glob.dictionary[pack + "." + item.name] = item.text;
                    }
                    return [4, get(pack, types_1.SysCollection.menus)];
                case 6:
                    menus = _g.sent();
                    for (_d = 0, menus_1 = menus; _d < menus_1.length; _d++) {
                        menu = menus_1[_d];
                        menu._package = pack;
                        exports.glob.menus.push(menu);
                    }
                    return [4, get(pack, types_1.SysCollection.roles)];
                case 7:
                    roles = _g.sent();
                    for (_e = 0, roles_1 = roles; _e < roles_1.length; _e++) {
                        role = roles_1[_e];
                        role._package = pack;
                        exports.glob.roles.push(role);
                    }
                    return [4, get(pack, types_1.SysCollection.drives)];
                case 8:
                    drives = _g.sent();
                    for (_f = 0, drives_1 = drives; _f < drives_1.length; _f++) {
                        drive = drives_1[_f];
                        drive._package = pack;
                        exports.glob.drives.push(drive);
                    }
                    return [2];
            }
        });
    });
}
function loadSystemCollections() {
    return __awaiter(this, void 0, void 0, function () {
        var _i, _a, packConfig, err_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    exports.glob.entities = [];
                    exports.glob.dictionary = {};
                    exports.glob.menus = [];
                    exports.glob.roles = [];
                    exports.glob.drives = [];
                    _i = 0, _a = getEnabledPackages();
                    _b.label = 1;
                case 1:
                    if (!(_i < _a.length)) return [3, 6];
                    packConfig = _a[_i];
                    _b.label = 2;
                case 2:
                    _b.trys.push([2, 4, , 5]);
                    return [4, loadPackageSystemCollections(packConfig)];
                case 3:
                    _b.sent();
                    return [3, 5];
                case 4:
                    err_1 = _b.sent();
                    exception(err_1);
                    packConfig.enabled = false;
                    return [3, 5];
                case 5:
                    _i++;
                    return [3, 1];
                case 6: return [2];
            }
        });
    });
}
function configureLogger(silent) {
    var logDir = path.join(process.env.PACKAGES_ROOT, 'logs');
    var infoLogFileName = 'info.log';
    var errorLogFileName = 'error.log';
    var logLevels = {
        levels: {
            emerg: 0,
            todo: 1,
            crit: 2,
            error: 3,
            warn: 4,
            notice: 5,
            info: 6,
            debug: 7,
            silly: 8
        },
        colors: {
            emerg: 'red',
            todo: 'red',
            crit: 'red',
            error: 'red',
            warn: 'yellow',
            notice: 'green',
            info: 'white',
            debug: 'gray',
            silly: 'gray'
        }
    };
    var transports = [
        new logger.transports.File({
            filename: path.join(logDir, errorLogFileName),
            level: 'error',
            format: logger.format.printf(function (info) { return moment().format('HH:mm:ss.SS') + "  " + info.level + "\t" + info.message; }),
        }),
        new logger.transports.File({
            filename: path.join(logDir, infoLogFileName),
            level: 'debug',
            format: logger.format.printf(function (info) { return moment().format('HH:mm:ss.SS') + "  " + info.level + "\t" + info.message; }),
        })
    ];
    if (!silent)
        transports.unshift(new logger.transports.Console({
            level: 'silly', format: logger.format.combine(logger.format.simple(), logger.format.printf(function (msg) { return logger.format.colorize().colorize(msg.level, "" + msg.message); }))
        }));
    logger.configure({ levels: logLevels.levels, exitOnError: false, transports: transports });
    logger.addColors(logLevels.colors);
}
exports.configureLogger = configureLogger;
function validateApp(pack, app) {
    if (!app.defaultTemplate) {
        warn("app.defaultTemplate is required for package '" + pack + "'");
        return false;
    }
    return true;
}
function initializeRoles() {
    var g = new graphlib.Graph();
    for (var _i = 0, _a = exports.glob.roles; _i < _a.length; _i++) {
        var role = _a[_i];
        g.setNode(role._id.toString());
        for (var _b = 0, _c = role.roles || []; _b < _c.length; _b++) {
            var subRole = _c[_b];
            g.setEdge(role._id.toString(), subRole.toString());
        }
    }
    for (var _d = 0, _e = exports.glob.roles; _d < _e.length; _d++) {
        var role = _e[_d];
        var result = graphlib.alg.postorder(g, role._id.toString());
        role.roles = result.map(function (item) {
            return new mongodb_1.ObjectId(item);
        });
    }
}
exports.initializeRoles = initializeRoles;
function checkAppMenu(app) {
    if (app.menu)
        app._menu = exports.glob.menus.find(function (menu) { return menu._id.equals(app.menu); });
    else
        app._menu = exports.glob.menus.find(function (menu) { return menu._package == app._package; });
    if (app.navmenu)
        app._navmenu = exports.glob.menus.find(function (menu) { return menu._id.equals(app.navmenu); });
    if (!app._menu)
        warn("Menu for app '" + app.title + "' not found!");
}
exports.checkAppMenu = checkAppMenu;
function initializePackages() {
    log("initializePackages: " + JSON.stringify(exports.glob.sysConfig.packages));
    exports.glob.apps = [];
    for (var _i = 0, _a = getEnabledPackages(); _i < _a.length; _i++) {
        var pack = _a[_i];
        var config = exports.glob.packages[pack.name]._config;
        var _loop_2 = function (app) {
            app._package = pack.name;
            app.dependencies = app.dependencies || [];
            app.dependencies.push(types_1.Constants.sysPackage);
            checkAppMenu(app);
            if (validateApp(pack.name, app)) {
                exports.glob.apps.push(app);
                var host = exports.glob.sysConfig.hosts.find(function (host) { return host.app.equals(app._id); });
                if (host)
                    host._app = app;
            }
        };
        for (var _b = 0, _c = (config.apps || []); _b < _c.length; _b++) {
            var app = _c[_b];
            _loop_2(app);
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
            warn("property '" + entity._package + "." + entity.name + "." + prop.name + "' type is empty!");
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
    var type = findEntity(prop.type);
    if (type == null) {
        prop._gtype = types_1.GlobalType.unknown;
        warn("Property '" + prop.name + "' invalid type '" + prop.type + "' not found. entity: " + entity.name + "!");
        return;
    }
    if (type.entityType == types_1.EntityType.Function) {
        var func = type;
        if (func.returnType && func.returnType.toString() == types_1.PType.text)
            prop._gtype = types_1.GlobalType.string;
        else
            prop._gtype = types_1.GlobalType.id;
    }
    else {
        var refType = prop.referType;
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
function connect(dbName) {
    return __awaiter(this, void 0, void 0, function () {
        var dbc, e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    if (exports.glob.dbs[dbName])
                        return [2, exports.glob.dbs[dbName]];
                    if (!process.env.DB_ADDRESS)
                        throw ("Environment variable 'DB_ADDRESS' is needed.");
                    return [4, mongodb_1.MongoClient.connect(process.env.DB_ADDRESS, { useNewUrlParser: true, useUnifiedTopology: true })];
                case 1:
                    dbc = _a.sent();
                    if (!dbc)
                        return [2, null];
                    return [2, exports.glob.dbs[dbName] = dbc.db(dbName)];
                case 2:
                    e_1 = _a.sent();
                    throw "db '" + dbName + "' connection failed [" + process.env.DB_ADDRESS + "]";
                case 3: return [2];
            }
        });
    });
}
exports.connect = connect;
function findEnum(type) {
    if (!type)
        return null;
    return exports.glob.enums.find(function (enm) { return enm._id.equals(type); });
}
exports.findEnum = findEnum;
function findEntity(id) {
    if (!id)
        return null;
    return exports.glob.entities.find(function (a) { return a._id.equals(id); });
}
exports.findEntity = findEntity;
function initializeEnums() {
    return __awaiter(this, void 0, void 0, function () {
        var _loop_3, _i, _a, pack;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    log('initializeEnums ...');
                    exports.glob.enums = [];
                    exports.glob.enumTexts = {};
                    _loop_3 = function (pack) {
                        var enums;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4, get(pack.name, types_1.SysCollection.enums)];
                                case 1:
                                    enums = _a.sent();
                                    enums.forEach(function (theEnum) {
                                        theEnum._package = pack.name;
                                        exports.glob.enums.push(theEnum);
                                        var texts = {};
                                        _.sortBy(theEnum.items, "_z").forEach(function (item) {
                                            texts[item.value] = item.title || item.name;
                                        });
                                        exports.glob.enumTexts[pack.name + "." + theEnum.name] = texts;
                                    });
                                    return [2];
                            }
                        });
                    };
                    _i = 0, _a = getEnabledPackages();
                    _b.label = 1;
                case 1:
                    if (!(_i < _a.length)) return [3, 4];
                    pack = _a[_i];
                    return [5, _loop_3(pack)];
                case 2:
                    _b.sent();
                    _b.label = 3;
                case 3:
                    _i++;
                    return [3, 1];
                case 4: return [2];
            }
        });
    });
}
exports.initializeEnums = initializeEnums;
function allObjects() {
    return exports.glob.entities.filter(function (en) { return en.entityType == types_1.EntityType.Object; });
}
exports.allObjects = allObjects;
function allFunctions() {
    return exports.glob.entities.filter(function (en) { return en.entityType == types_1.EntityType.Function; });
}
exports.allFunctions = allFunctions;
function initializeEntities() {
    log("Initializing '" + allObjects().length + "' Objects ...");
    var allObjs = allObjects();
    for (var _i = 0, allObjs_1 = allObjs; _i < allObjs_1.length; _i++) {
        var obj = allObjs_1[_i];
        initObject(obj);
    }
    log("Initializing '" + allFunctions().length + "' functions ...");
    for (var _a = 0, _b = allFunctions(); _a < _b.length; _a++) {
        var func = _b[_a];
        try {
            func._access = {};
            func._access[func._package] = func.access;
            initProperties(func.parameters, func, func.title);
        }
        catch (ex) {
            exception(ex);
            error("Init functions, Module: " + func._package + ", Action: " + func.name);
        }
    }
}
function initProperties(properties, entity, parentTitle) {
    if (!properties)
        return;
    var _loop_4 = function (prop) {
        var sysProperty = exports.glob.systemProperties.find(function (p) { return p.name === prop.name; });
        if (sysProperty)
            _.defaultsDeep(prop, sysProperty);
        prop.group = prop.group || parentTitle;
        checkPropertyGtype(prop, entity);
        initProperties(prop.properties, entity, prop.title);
    };
    for (var _i = 0, properties_1 = properties; _i < properties_1.length; _i++) {
        var prop = properties_1[_i];
        _loop_4(prop);
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
            var referenceObj = findEntity(obj.reference);
            if (!referenceObj)
                return warn("SimilarObject in service '" + obj._package + "' not found for object: '" + obj.title + "', SimilarObjectID:" + obj.reference);
            initObject(referenceObj);
            _.defaultsDeep(obj, referenceObj);
            compareParentProperties(obj.properties, referenceObj.properties, obj);
        }
        else if (obj.properties) {
            for (var _i = 0, _a = obj.properties; _i < _a.length; _i++) {
                var prop = _a[_i];
                checkPropertyReference(prop, obj);
            }
        }
    }
    catch (ex) {
        exception(ex);
        error("initObject, Error in object " + obj._package + "." + obj.name);
    }
}
exports.initObject = initObject;
function checkPropertyReference(property, entity) {
    if (property._gtype == types_1.GlobalType.object && (!property.properties || !property.properties.length)) {
        var propertyParentObject = findEntity(property.type);
        if (!propertyParentObject) {
            if (property._gtype == types_1.GlobalType.object)
                return;
            return error("Property '" + entity._package + "." + entity.name + "." + property.name + "' type '" + property.type + "' not found.");
        }
        initObject(propertyParentObject);
        property.properties = property.properties || [];
        if (!property._parentPropertiesCompared) {
            property._parentPropertiesCompared = true;
            compareParentProperties(property.properties, propertyParentObject.properties, entity);
        }
    }
    else if (property.properties)
        for (var _i = 0, _a = property.properties; _i < _a.length; _i++) {
            var prop = _a[_i];
            checkPropertyReference(prop, entity);
        }
}
function compareParentProperties(properties, parentProperties, entity) {
    if (!parentProperties)
        return;
    var parentNames = parentProperties.map(function (p) { return p.name; });
    properties.filter(function (p) { return parentNames.indexOf(p.name) == -1; }).forEach(function (newProperty) { return checkPropertyReference(newProperty, entity); });
    var _loop_5 = function (parentProperty) {
        var property = properties.find(function (p) { return p.name === parentProperty.name; });
        if (!property) {
            properties.push(parentProperty);
            return "continue";
        }
        _.defaultsDeep(property, parentProperty);
        if (property.referType == types_1.PropertyReferType.inlineData && property.type) {
            try {
                var propertyParentObject = findEntity(property.type);
                if (!propertyParentObject) {
                    error("(HandleSimilarProperty) Object '" + property.type + "' not found as property " + property.title + " reference.");
                    return "continue";
                }
                if (!propertyParentObject._inited)
                    initObject(propertyParentObject);
                if (!property._parentPropertiesCompared) {
                    property._parentPropertiesCompared = true;
                    compareParentProperties(property.properties, propertyParentObject.properties, entity);
                }
            }
            catch (ex) {
                exception(ex);
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
    };
    for (var _i = 0, parentProperties_1 = parentProperties; _i < parentProperties_1.length; _i++) {
        var parentProperty = parentProperties_1[_i];
        _loop_5(parentProperty);
    }
}
function getEntityName(id) {
    var obj = findEntity(id);
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
    var localeName = types_1.Locale[cn.locale];
    if (text[localeName])
        return text[localeName];
    else
        return _.values(text)[0];
}
exports.getText = getText;
function getEnumText(thePackage, dependencies, enumType, value, locale) {
    if (value == null)
        return "";
    var theEnum = getEnumByName(thePackage, dependencies, enumType);
    if (!theEnum)
        return value;
    var text = theEnum[value];
    return getMultilLangugeText(text, locale);
}
exports.getEnumText = getEnumText;
function getEnumByName(thePackage, dependencies, enumType) {
    var theEnum = exports.glob.enumTexts[thePackage + "." + enumType];
    for (var i = 0; !theEnum && i < dependencies.length; i++) {
        theEnum = exports.glob.enumTexts[dependencies[i] + "." + enumType];
    }
    return theEnum;
}
exports.getEnumByName = getEnumByName;
function createEnumDataSource(thePackage, dependencies, enumType, nullable, locale) {
    var theEnum = getEnumByName(thePackage, dependencies, enumType);
    var result = {};
    if (nullable)
        result[0] = " ";
    for (var key in theEnum) {
        result[key] = getMultilLangugeText(theEnum[key], locale);
    }
    return result;
}
exports.createEnumDataSource = createEnumDataSource;
function getEnumsTexts(thePackage, enumType, values, locale) {
    if (values == null)
        return null;
    var theEnum = exports.glob.enumTexts[thePackage + "." + enumType];
    if (!theEnum)
        return null;
    var texts = [];
    values.forEach(function (value) {
        var text = theEnum[value];
        texts.push(getMultilLangugeText(text, locale));
    });
    return texts;
}
exports.getEnumsTexts = getEnumsTexts;
function isRightToLeftLanguage(loc) {
    return loc == types_1.Locale.ar || loc == types_1.Locale.fa;
}
exports.isRightToLeftLanguage = isRightToLeftLanguage;
function getMultilLangugeText(text, loc) {
    if (!text)
        return "";
    if (typeof (text) == "object") {
        if (text.en && loc == types_1.Locale.en)
            return text.en;
        else if (text.fa && loc == types_1.Locale.fa)
            return text.fa;
        else
            return text.en || text.fa;
    }
    return text.toString();
}
exports.getMultilLangugeText = getMultilLangugeText;
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
    return _.flatten(fs.readdirSync(path).map(function (file) {
        var fileOrDir = fs.statSync([path, file].join('/'));
        if (fileOrDir.isFile())
            return (path + '/' + file).replace(/^\.\/\/?/, '');
        else if (fileOrDir.isDirectory())
            return getAllFiles([path, file].join('/'));
    }));
}
exports.getAllFiles = getAllFiles;
function getPathSize(path) {
    var files = getAllFiles(path);
    var totalSize = 0;
    files.forEach(function (f) {
        totalSize += fs.statSync(f).size;
    });
    return totalSize;
}
exports.getPathSize = getPathSize;
function applyFileQuota(dir, quota) {
    while (true) {
        var rootPathes = fs.readdirSync(dir);
        var size = getPathSize(dir);
        if (size < quota)
            break;
        var oldestPath = _.minBy(rootPathes, function (f) {
            var fullPath = path.join(dir, f);
            return fs.statSync(fullPath).ctime;
        });
        oldestPath = path.join(dir, oldestPath);
        try {
            fs.removeSync(oldestPath);
        }
        catch (ex) {
            error("Can not remove path: '" + oldestPath + "'");
        }
    }
}
exports.applyFileQuota = applyFileQuota;
function toQueryString(obj) {
    var str = '';
    for (var key in obj) {
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
        var m = value.split("__REGEXP ")[1].match(/\/(.*)\/(.*)?/);
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
    var match = date.match(/(\d+)\/(\d+)\/(\d+)/);
    if (!match)
        return new Date(date);
    var year = parseInt(match[1]);
    var month = parseInt(match[2]);
    var day = parseInt(match[3]);
    var result = null;
    if (loc == types_1.Locale.fa) {
        if (day > 31) {
            var t = day;
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
function getTypes(cn) {
    return __awaiter(this, void 0, void 0, function () {
        var objects, functions, enums, types, ptypes, type;
        return __generator(this, function (_a) {
            objects = allObjects().map(function (ent) {
                var title = getText(cn, ent.title) + (cn.pack == ent._package ? "" : " (" + ent._package + ")");
                return { ref: ent._id, title: title };
            });
            functions = allFunctions().map(function (ent) {
                var title = getText(cn, ent.title) + (cn.pack == ent._package ? "" : " (" + ent._package + ")");
                return { ref: ent._id, title: title };
            });
            enums = exports.glob.enums.map(function (ent) {
                var title = getText(cn, ent.title) + (cn.pack == ent._package ? "" : " (" + ent._package + ")");
                return { ref: ent._id, title: title };
            });
            types = objects.concat(functions, enums);
            types = _.orderBy(types, ['title']);
            ptypes = [];
            for (type in types_1.PType) {
                ptypes.push({ ref: new mongodb_1.ObjectId(types_1.PType[type]), title: getText(cn, type, true) });
            }
            types.unshift({ ref: "", title: "-" });
            types = ptypes.concat(types);
            return [2, types];
        });
    });
}
exports.getTypes = getTypes;
function getAllEntities(cn) {
    return __awaiter(this, void 0, void 0, function () {
        var entities;
        return __generator(this, function (_a) {
            entities = exports.glob.entities.map(function (ent) {
                var title = getText(cn, ent.title) + (cn.pack == ent._package ? "" : " (" + ent._package + ")");
                return { ref: ent._id, title: title };
            });
            entities = _.orderBy(entities, ['title']);
            return [2, entities];
        });
    });
}
exports.getAllEntities = getAllEntities;
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
    var getCircularReplacer = function () {
        var seen = new WeakSet();
        return function (key, value) {
            if (typeof value === "object" && value !== null) {
                if (seen.has(value)) {
                    return { _$: value._0 };
                }
                for (var attr in value) {
                    var val = value[attr];
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
    var seen = new WeakSet();
    var setKeys = function (obj, parentKey) {
        if (seen.has(obj))
            return;
        seen.add(obj);
        for (var key in obj) {
            var val = obj[key];
            if (!val)
                continue;
            if (typeof val === "object" && val.constructor != mongodb_1.ObjectId) {
                if (val._0 == null) {
                    val._0 = parentKey + (Array.isArray(obj) ? "[" + key + "]" : "['" + key + "']");
                }
                setKeys(val, val._0);
            }
        }
    };
    setKeys(value, "");
    var str = JSON.stringify(value, getCircularReplacer());
    return str;
}
exports.stringify = stringify;
function parse(str) {
    var json = typeof str == "string" ? JSON.parse(str) : str;
    var keys = {};
    var findKeys = function (obj) {
        if (obj && obj._0) {
            keys[obj._0] = obj;
            delete obj._0;
        }
        for (var key in obj) {
            if (typeof obj[key] === "object")
                findKeys(obj[key]);
        }
    };
    var seen = new WeakSet();
    var replaceRef = function (obj) {
        if (seen.has(obj))
            return;
        seen.add(obj);
        for (var key in obj) {
            var val = obj[key];
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
function getPropertyReferenceValues(cn, prop, instance) {
    return __awaiter(this, void 0, void 0, function () {
        var items, entity, result, typeFunc, args, _i, _a, param;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (prop._enum) {
                        items = _.map(prop._enum.items, function (item) {
                            return { ref: item.value, title: getText(cn, item.title) };
                        });
                        return [2, items];
                    }
                    entity = findEntity(prop.type);
                    if (!entity) {
                        error("Property '" + prop.name + "' type '" + prop.type + "' not found.");
                        throw types_1.StatusCode.NotFound;
                    }
                    if (!(entity.entityType == types_1.EntityType.Object)) return [3, 2];
                    return [4, get(cn.pack, entity.name, { count: 10 })];
                case 1:
                    result = _b.sent();
                    if (result) {
                        return [2, _.map(result, function (item) {
                                return { ref: item._id, title: getText(cn, item.title) };
                            })];
                    }
                    else
                        return [2, null];
                    return [3, 4];
                case 2:
                    if (!(entity.entityType === types_1.EntityType.Function)) return [3, 4];
                    typeFunc = entity;
                    args = [];
                    if (typeFunc.parameters)
                        for (_i = 0, _a = typeFunc.parameters; _i < _a.length; _i++) {
                            param = _a[_i];
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
                    return [4, invoke(cn, typeFunc, args)];
                case 3: return [2, _b.sent()];
                case 4: return [2];
            }
        });
    });
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
    for (var key in sample.input) {
        if (!_.isEqual(sample.input[key], cn.req[key]))
            return false;
    }
    return true;
}
function mock(cn, func, args) {
    return __awaiter(this, void 0, void 0, function () {
        var withInputs, _i, withInputs_1, sample, withoutInput;
        return __generator(this, function (_a) {
            log("mocking function '" + cn.pack + "." + func.name + "' ...");
            if (!func.test.samples || !func.test.samples.length)
                return [2, { code: types_1.StatusCode.Ok, message: "No sample data!" }];
            withInputs = func.test.samples.filter(function (sample) {
                return sample.input;
            });
            for (_i = 0, withInputs_1 = withInputs; _i < withInputs_1.length; _i++) {
                sample = withInputs_1[_i];
                if (mockCheckMatchInput(cn, func, args, sample)) {
                    if (sample.code)
                        return [2, { code: sample.code, message: sample.message, result: sample.result }];
                    else
                        return [2, sample.input];
                }
            }
            withoutInput = func.test.samples.find(function (sample) { return !sample.input; });
            if (withoutInput) {
                if (withoutInput.code)
                    return [2, { code: withoutInput.code, message: withoutInput.message }];
                else
                    return [2, withoutInput.input];
            }
            return [2, { code: types_1.StatusCode.Ok, message: "No default sample data!" }];
        });
    });
}
exports.mock = mock;
function invoke(cn, func, args) {
    return __awaiter(this, void 0, void 0, function () {
        var action, app, _i, _a, pack, STRIP_COMMENTS, ARGUMENT_NAMES, fnStr, argNames, ex_2;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 7, , 8]);
                    if (!(func.test && func.test.mock && envMode() == types_1.EnvMode.Development && cn.url.pathname != "/functionTest")) return [3, 2];
                    return [4, mock(cn, func, args)];
                case 1: return [2, _b.sent()];
                case 2:
                    action = require(path.join(process.env.PACKAGES_ROOT, func._package, "src/main"))[func.name];
                    if (!action) {
                        if (func._package == types_1.Constants.sysPackage)
                            action = require(path.join(process.env.PACKAGES_ROOT, "web/src/main"))[func.name];
                        if (!action) {
                            app = exports.glob.apps.find(function (app) { return app._package == cn.pack; });
                            for (_i = 0, _a = app.dependencies; _i < _a.length; _i++) {
                                pack = _a[_i];
                                action = require(path.join(process.env.PACKAGES_ROOT, pack, "src/main"))[func.name];
                                if (action)
                                    break;
                            }
                        }
                    }
                    if (!action)
                        throw "Function'" + func.name + "'notfound.";
                    STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
                    ARGUMENT_NAMES = /([^\s,]+)/g;
                    fnStr = action.toString().replace(STRIP_COMMENTS, '');
                    argNames = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);
                    if (argNames === null)
                        argNames = [];
                    if (!(args.length == 0)) return [3, 4];
                    return [4, action(cn)];
                case 3: return [2, _b.sent()];
                case 4: return [4, action.apply(void 0, __spreadArrays([cn], args))];
                case 5: return [2, _b.sent()];
                case 6: return [3, 8];
                case 7:
                    ex_2 = _b.sent();
                    if (ex_2.message == func.name + " is not defined") {
                        todo(ex_2.message);
                        throw types_1.StatusCode.NotImplemented;
                    }
                    else {
                        exception(ex_2);
                        throw ex_2.message;
                    }
                    return [3, 8];
                case 8: return [2];
            }
        });
    });
}
exports.invoke = invoke;
function runFunction(cn, functionId, input) {
    return __awaiter(this, void 0, void 0, function () {
        var func, args, _i, _a, para;
        return __generator(this, function (_b) {
            func = findEntity(functionId);
            if (!func)
                throw types_1.StatusCode.NotFound;
            input = input || {};
            args = [];
            if (func.parameters)
                for (_i = 0, _a = func.parameters; _i < _a.length; _i++) {
                    para = _a[_i];
                    args.push(input[para.name]);
                }
            return [2, invoke(cn, func, args)];
        });
    });
}
exports.runFunction = runFunction;
function isObjectId(value) {
    return value._bsontype == "ObjectID";
}
exports.isObjectId = isObjectId;
function throwError(code, message) {
    throw new types_1.ErrorResult(code, message);
}
exports.throwError = throwError;
//# sourceMappingURL=main.js.map