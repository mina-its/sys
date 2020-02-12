"use strict";
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
exports.__esModule = true;
var logger = require("winston");
var mongodb = require("mongodb");
var xmlBuilder = require("xmlbuilder");
var fs = require("fs-extra");
var path = require("path");
var moment = require("moment");
var _ = require("lodash");
var async = require("async");
var graphlib = require("graphlib");
var Jalali = require("jalali-moment");
var AWS = require("aws-sdk");
var mongodb_1 = require("mongodb");
var types_1 = require("./types");
var EJSON = require('bson').EJSON;
exports.glob = new types_1.Global();
function reload(cn, done) {
    var startTime = moment();
    log("reload ...");
    async.series([
        loadSysConfig,
        loadSystemCollections,
        loadGeneralCollections,
        loadAuditTypes,
        initializeEnums,
        initializePackages,
        initializeRoles,
        initializeEntities
    ], function (err) {
        var period = moment().diff(startTime, 'ms', true);
        info("reload done in '" + period + "' ms.");
        done(err);
    });
}
exports.reload = reload;
function start(callback) {
    process.on('uncaughtException', function (err) {
        audit(types_1.SysAuditTypes.uncaughtException, { level: types_1.LogLevel.Emerg, comment: err.message + ". " + err.stack });
    });
    process.on('unhandledRejection', function (reason, p) {
        audit(types_1.SysAuditTypes.unhandledRejection, { level: types_1.LogLevel.Emerg, detail: reason });
    });
    configureLogger(false);
    reload(null, function (err) {
        callback(err, exports.glob);
    });
}
exports.start = start;
function isWindows() {
    return /^win/.test(process.platform);
}
function audit(auditType, args) {
    args.type = args.type || new mongodb_1.ObjectId(auditType);
    args.time = new Date();
    var comment = args.comment || "";
    var type = _.find(exports.glob.auditTypes, function (type) {
        return type._id.equals(args.type);
    });
    var msg = "audit(" + (type ? type.name : args.type) + "): " + comment;
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
        return;
    put(args.pack || types_1.Constants.sysPackage, types_1.SysCollection.audits, args);
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
function get(pack, objectName, options, done) {
    var db = exports.glob.dbs[pack];
    if (!db)
        return done("db for pack '" + pack + "' not found.", null);
    options = options || {};
    var collection = db.collection(objectName);
    if (options.itemId)
        collection.findOne(options.itemId, done);
    else {
        var find = collection.find(options.query);
        if (options.sort)
            find = find.sort(options.sort);
        if (options.last)
            find = find.sort({ $natural: -1 });
        if (options.count)
            find = find.limit(options.count);
        if (options.skip)
            find = find.skip(options.skip);
        find.toArray(function (err, result) {
            if (options.count === 1 && result)
                done(null, result[0]);
            else
                done(err, result);
        });
    }
}
exports.get = get;
function put(pack, objectName, item, options, done) {
    var collection = exports.glob.dbs[pack].collection(objectName);
    done = done || (function () {
    });
    if (!collection)
        return done(types_1.StatusCode.BadRequest);
    item = item || {};
    if (!options || !options.portions || options.portions.length == 1) {
        if (item._id)
            collection.replaceOne({ _id: item._id }, item, function (err, result) {
                if (err) {
                    error(err);
                    done(types_1.StatusCode.ServerError);
                }
                else {
                    done((result && result.modifiedCount) ? types_1.StatusCode.Ok : types_1.StatusCode.ResetContent, {
                        type: types_1.ObjectModifyType.Update,
                        item: item,
                        itemId: item._id
                    });
                }
            });
        else
            collection.insertOne(item, function (err, result) {
                if (err) {
                    error(err);
                    done(types_1.StatusCode.ServerError);
                }
                else {
                    done((result && result.insertedCount) ? types_1.StatusCode.Ok : types_1.StatusCode.ResetContent, {
                        type: types_1.ObjectModifyType.Insert,
                        item: item,
                        itemId: item._id
                    });
                }
            });
        return;
    }
    var portions = options.portions;
    switch (portions.length) {
        case 2:
            collection.save(item, function (err, result) {
                if (err) {
                    error(err);
                    done(types_1.StatusCode.ServerError);
                }
                else {
                    done((result && result.insertedCount) ? types_1.StatusCode.Ok : types_1.StatusCode.ResetContent, {
                        type: types_1.ObjectModifyType.Update,
                        item: item,
                        itemId: item._id
                    });
                }
            });
            break;
        default:
            var command_1 = { $addToSet: {} };
            item._id = item._id || new mongodb_1.ObjectId();
            var rootId_1 = portions[1].itemId;
            portionsToMongoPath(pack, rootId_1, portions, portions.length, function (err, path) {
                command_1.$addToSet[path] = item;
                collection.updateOne({ _id: rootId_1 }, command_1, function (err, result) {
                    if (err) {
                        error(err);
                        done(types_1.StatusCode.ServerError);
                    }
                    else {
                        done((result && result.modifiedCount) ? types_1.StatusCode.Ok : types_1.StatusCode.ResetContent, {
                            type: types_1.ObjectModifyType.Patch,
                            item: item,
                            itemId: rootId_1
                        });
                    }
                });
            });
            break;
    }
}
exports.put = put;
function portionsToMongoPath(pack, rootId, portions, endIndex, done) {
    if (endIndex == 3)
        return done(null, portions[2].property.name);
    var collection = exports.glob.dbs[pack].collection(portions[0].value);
    if (!collection)
        return done(types_1.StatusCode.BadRequest);
    collection.findOne({ _id: rootId }, function (err, item) {
        var value = item;
        if (err || !value)
            return done(err || types_1.StatusCode.ServerError);
        var path = "";
        var _loop_1 = function (i) {
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
                    return { value: done(types_1.StatusCode.ServerError) };
                path += "." + value.indexOf(partItem);
                value = partItem;
            }
        };
        for (var i = 2; i < endIndex; i++) {
            var state_1 = _loop_1(i);
            if (typeof state_1 === "object")
                return state_1.value;
        }
        done(null, _.trim(path, '.'));
    });
}
exports.portionsToMongoPath = portionsToMongoPath;
function count(pack, objectName, options, done) {
    get(pack, objectName, options, function (err, result) {
        if (err)
            return done(null);
        var count = !result ? 0 : (Array.isArray(result) ? result.length : 1);
        done(count);
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
function patch(pack, objectName, patchData, options, done) {
    var collection = exports.glob.dbs[pack].collection(objectName);
    done = done || (function () {
    });
    if (!collection)
        return done(types_1.StatusCode.BadRequest);
    if (!options)
        options = { portions: [] };
    var portions = options.portions;
    if (!portions)
        portions = [{ type: types_1.RefPortionType.entity, value: objectName }];
    if (portions.length == 1)
        return done(types_1.StatusCode.BadRequest);
    var rootId = portions.length < 2 ? patchData._id : portions[1].itemId;
    portionsToMongoPath(pack, rootId, portions, portions.length, function (err, path) {
        var command = { $set: {}, $unset: {} };
        if (portions[portions.length - 1].property && portions[portions.length - 1].property._gtype == types_1.GlobalType.file)
            command["$set"][path] = patchData;
        else
            for (var key in patchData) {
                if (key == "_id")
                    continue;
                command[patchData[key] == null ? "$unset" : "$set"][path + (path ? "." : "") + key] = patchData[key];
            }
        if (_.isEmpty(command.$unset))
            delete command.$unset;
        if (_.isEmpty(command.$set))
            delete command.$set;
        var rootId = portions[1].itemId;
        collection.updateOne({ _id: rootId }, command, function (err, result) {
            if (err) {
                error(err);
                done(types_1.StatusCode.ServerError);
            }
            else {
                done((result && result.modifiedCount) ? types_1.StatusCode.Ok : types_1.StatusCode.ResetContent, {
                    type: types_1.ObjectModifyType.Patch,
                    item: patchData,
                    itemId: rootId
                });
            }
        });
    });
}
exports.patch = patch;
function del(pack, objectName, options, done) {
    var collection = exports.glob.dbs[pack].collection(objectName);
    if (!collection || !options)
        return done(types_1.StatusCode.BadRequest);
    if (options.itemId)
        return collection.deleteOne({ _id: options.itemId }, function (err, result) {
            if (err) {
                error(err);
                done(types_1.StatusCode.ServerError);
            }
            else {
                done((result && result.deletedCount) ? types_1.StatusCode.Ok : types_1.StatusCode.ResetContent, {
                    type: types_1.ObjectModifyType.Delete,
                    item: null,
                    itemId: options.itemId
                });
            }
        });
    var portions = options.portions;
    if (portions.length == 1 || portions.length == 3)
        return done(types_1.StatusCode.BadRequest);
    switch (portions.length) {
        case 2:
            collection.deleteOne({ _id: portions[1].itemId }, function (err, result) {
                if (err) {
                    error(err);
                    done(types_1.StatusCode.ServerError);
                }
                else {
                    done((result && result.deletedCount) ? types_1.StatusCode.Ok : types_1.StatusCode.ResetContent, {
                        type: types_1.ObjectModifyType.Delete,
                        item: null,
                        itemId: portions[1].itemId
                    });
                }
            });
            break;
        default:
            var command_2 = { $pull: {} };
            var rootId_2 = portions[1].itemId;
            var itemId_1 = portions[portions.length - 1].itemId;
            portionsToMongoPath(pack, rootId_2, portions, portions.length - 1, function (err, path) {
                command_2.$pull[path] = { _id: itemId_1 };
                collection.updateOne({ _id: rootId_2 }, command_2, function (err, result) {
                    if (err) {
                        error(err);
                        done(types_1.StatusCode.ServerError);
                    }
                    else {
                        done((result && result.modifiedCount) ? types_1.StatusCode.Ok : types_1.StatusCode.ResetContent, {
                            type: types_1.ObjectModifyType.Patch,
                            item: null,
                            itemId: rootId_2
                        });
                    }
                });
            });
            break;
    }
}
exports.del = del;
function getFile(drive, filePath, done) {
    switch (drive.type) {
        case types_1.SourceType.File:
            var _path = path.join(drive.address, filePath);
            fs.readFile(_path, function (err, file) {
                if (err)
                    error(err);
                if (!file)
                    return done(types_1.StatusCode.NotFound);
                done(null, file);
            });
            break;
        case types_1.SourceType.Db:
            var db = exports.glob.dbs[drive._package];
            var bucket = new mongodb.GridFSBucket(db);
            var stream = bucket.openDownloadStreamByName(filePath);
            var data_1;
            stream.on("end", function () {
                return done(null, data_1);
            }).on("data", function (chunk) {
                data_1 = data_1 ? Buffer.concat([data_1, chunk]) : chunk;
            }).on("error", function (err) {
                error(err);
                return done(types_1.StatusCode.NotFound);
            });
            break;
        default:
            return done(types_1.StatusCode.NotImplemented);
    }
}
exports.getFile = getFile;
function putFile(host, drive, filePath, file, done) {
    switch (drive.type) {
        case types_1.SourceType.File:
            var _path_1 = path.join(drive.address, filePath);
            fs.mkdir(path.dirname(_path_1), { recursive: true }, function (err) {
                if (err)
                    return done(err);
                fs.writeFile(_path_1, file, function (err) {
                    if (err)
                        error(err);
                    done(err ? types_1.StatusCode.ServerError : types_1.StatusCode.Ok);
                });
            });
            break;
        case types_1.SourceType.Db:
            var db = exports.glob.dbs[host];
            var bucket = new mongodb.GridFSBucket(db);
            var stream_1 = bucket.openUploadStream(filePath);
            delFile(host, filePath, function () {
                stream_1.on("error", function (err) {
                    error(err);
                    done(err ? types_1.StatusCode.ServerError : types_1.StatusCode.Ok);
                }).end(file, done);
            });
            break;
        case types_1.SourceType.S3:
            if (!exports.glob.sysConfig.amazon || !exports.glob.sysConfig.amazon.accessKeyId) {
                error('s3 accessKeyId, secretAccessKey is required in sysConfig!');
                return done(types_1.StatusCode.SystemConfigurationProblem);
            }
            AWS.config.accessKeyId = exports.glob.sysConfig.amazon.accessKeyId;
            AWS.config.secretAccessKey = exports.glob.sysConfig.amazon.secretAccessKey;
            var s3 = new AWS.S3({ apiVersion: types_1.Constants.amazonS3ApiVersion });
            s3.upload({ Bucket: drive.address, Key: path.basename(filePath), Body: file }, function (err, data) {
                if (err || !data) {
                    error(err || "s3 upload failed");
                    done(types_1.StatusCode.ServerError);
                }
                else
                    done(null, { url: data.Location });
            });
            break;
        default:
            return done(types_1.StatusCode.NotImplemented);
    }
}
exports.putFile = putFile;
function getFileInfo(host, filePath, done) {
}
exports.getFileInfo = getFileInfo;
function delFile(host, filePath, done) {
}
exports.delFile = delFile;
function movFile(host, sourcePath, targetPath, done) {
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
function loadGeneralCollections(done) {
    log('loadGeneralCollections ...');
    get(types_1.Constants.sysPackage, types_1.Constants.timeZonesCollection, null, function (err, timeZones) {
        exports.glob.timeZones = timeZones;
        get(types_1.Constants.sysPackage, types_1.SysCollection.objects, {
            query: { name: types_1.Constants.systemPropertiesObjectName },
            count: 1
        }, function (err, result) {
            if (!result)
                emerg('systemProperties object not found!');
            exports.glob.systemProperties = result ? result.properties : [];
            done();
        });
    });
}
function loadAuditTypes(done) {
    log('loadAuditTypes ...');
    get(types_1.Constants.sysPackage, types_1.SysCollection.auditTypes, null, function (err, auditTypes) {
        exports.glob.auditTypes = auditTypes;
        done();
    });
}
function getEnabledPackages() {
    return exports.glob.sysConfig.packages.filter(function (pack) {
        return pack.enabled;
    });
}
function loadSysConfig(done) {
    connect(types_1.Constants.sysPackage, function (err) {
        if (err)
            return done(err);
        exports.glob.dbs[types_1.Constants.sysPackage].collection(types_1.SysCollection.systemConfig).findOne({}, function (err, config) {
            exports.glob.sysConfig = config;
            for (var _i = 0, _a = getEnabledPackages(); _i < _a.length; _i++) {
                var pack = _a[_i];
                exports.glob.packages[pack.name] = require("../" + pack.name + "/main");
                if (exports.glob.packages[pack.name] == null)
                    error("Error loading package " + pack.name + "!");
                else {
                    var p = require("../" + pack.name + "/package.json");
                    exports.glob.packages[pack.name]._version = p.version;
                    log("package '" + pack.name + "' loaded. version: " + p.version);
                }
            }
            done();
        });
    });
}
function loadSystemCollections(done) {
    exports.glob.entities = [];
    exports.glob.dictionary = {};
    exports.glob.menus = [];
    exports.glob.roles = [];
    exports.glob.drives = [];
    if (!process.env.DB_ADDRESS)
        return done("Environment variable 'DB_ADDRESS' is needed!");
    async.eachSeries(getEnabledPackages(), function (packConfig, nextPackage) {
        var pack = packConfig.name;
        connect(pack, function (err) {
            if (err)
                return nextPackage();
            log("Loading system collections package '" + pack + "' ...");
            async.series([
                function (next) {
                    exports.glob.dbs[pack].collection(types_1.SysCollection.configs).findOne(null, function (err, config) {
                        if (!config) {
                            packConfig.enabled = false;
                            error("Config for package '" + pack + "' not found!");
                        }
                        else
                            exports.glob.packages[pack]._config = config;
                        next();
                    });
                },
                function (next) {
                    exports.glob.dbs[pack].collection(types_1.SysCollection.objects).find({}).toArray(function (err, objects) {
                        for (var _i = 0, objects_1 = objects; _i < objects_1.length; _i++) {
                            var object = objects_1[_i];
                            object._package = pack;
                            object.entityType = types_1.EntityType.Object;
                            exports.glob.entities.push(object);
                        }
                        next();
                    });
                },
                function (next) {
                    exports.glob.dbs[pack].collection(types_1.SysCollection.functions).find({}).toArray(function (err, functions) {
                        for (var _i = 0, functions_1 = functions; _i < functions_1.length; _i++) {
                            var func = functions_1[_i];
                            func._package = pack;
                            func.entityType = types_1.EntityType.Function;
                            exports.glob.entities.push(func);
                        }
                        next();
                    });
                },
                function (next) {
                    exports.glob.dbs[pack].collection(types_1.SysCollection.views).find({}).toArray(function (err, views) {
                        for (var _i = 0, views_1 = views; _i < views_1.length; _i++) {
                            var view = views_1[_i];
                            view._package = pack;
                            view.entityType = types_1.EntityType.View;
                            exports.glob.entities.push(view);
                        }
                        next();
                    });
                },
                function (next) {
                    exports.glob.dbs[pack].collection(types_1.SysCollection.dictionary).find({}).toArray(function (err, texts) {
                        for (var _i = 0, texts_1 = texts; _i < texts_1.length; _i++) {
                            var item = texts_1[_i];
                            exports.glob.dictionary[pack + "." + item.name] = item.text;
                        }
                        next();
                    });
                },
                function (next) {
                    exports.glob.dbs[pack].collection(types_1.SysCollection.menus).find({}).toArray(function (err, menus) {
                        for (var _i = 0, menus_1 = menus; _i < menus_1.length; _i++) {
                            var menu = menus_1[_i];
                            menu._package = pack;
                            exports.glob.menus.push(menu);
                        }
                        next();
                    });
                },
                function (next) {
                    exports.glob.dbs[pack].collection(types_1.SysCollection.roles).find({}).toArray(function (err, roles) {
                        for (var _i = 0, roles_1 = roles; _i < roles_1.length; _i++) {
                            var role = roles_1[_i];
                            role._package = pack;
                            exports.glob.roles.push(role);
                        }
                        next();
                    });
                },
                function (next) {
                    exports.glob.dbs[pack].collection(types_1.SysCollection.drives).find({}).toArray(function (err, drives) {
                        for (var _i = 0, drives_1 = drives; _i < drives_1.length; _i++) {
                            var drive = drives_1[_i];
                            drive._package = pack;
                            exports.glob.drives.push(drive);
                        }
                        next();
                    });
                }
            ], nextPackage);
        });
    }, done);
}
function configureLogger(silent) {
    var logDir = path.join(__dirname, '../logs');
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
function initializeRoles(done) {
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
    done();
}
exports.initializeRoles = initializeRoles;
function checkAppMenu(app) {
    if (app.menu) {
        app._menu = _.find(exports.glob.menus, function (menu) {
            return menu._id.equals(app.menu);
        });
    }
    else {
        app._menu = _.find(exports.glob.menus, function (menu) {
            return menu._package == app._package;
        });
    }
    if (!app._menu)
        warn("Menu for app '" + app.title + "' not found!");
}
function initializePackages(done) {
    log("initializePackages: " + JSON.stringify(exports.glob.sysConfig.packages));
    exports.glob.apps = [];
    getEnabledPackages().forEach(function (pack) {
        var config = exports.glob.packages[pack.name]._config;
        var _loop_2 = function (app) {
            app._package = pack.name;
            app.dependencies = app.dependencies || [];
            app.dependencies.push(types_1.Constants.sysPackage);
            checkAppMenu(app);
            if (validateApp(pack.name, app)) {
                exports.glob.apps.push(app);
                var host = exports.glob.sysConfig.hosts.filter(function (host) {
                    return host.app.equals(app._id);
                }).pop();
                if (host)
                    host._app = app;
            }
        };
        for (var _i = 0, _a = (config.apps || []); _i < _a.length; _i++) {
            var app = _a[_i];
            _loop_2(app);
        }
    });
    done();
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
function connect(dbName, callback) {
    try {
        if (exports.glob.dbs[dbName])
            return callback();
        if (!process.env.DB_ADDRESS) {
            return callback("Environment variable 'DB_ADDRESS' is needed.");
        }
        var url = process.env.DB_ADDRESS.replace(/admin/, dbName);
        mongodb_1.MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true }, function (err, dbc) {
            if (err) {
                error('Unable to connect to the mongoDB server. Error:' + err);
                callback(err);
            }
            else {
                exports.glob.dbs[dbName] = dbc.db(dbName);
                callback();
            }
        });
    }
    catch (ex) {
        exception(ex);
        callback(ex.message);
    }
}
exports.connect = connect;
function getDatabase(db, callback) {
    if (exports.glob.dbs[db])
        return callback(null, exports.glob.dbs[db]);
    connect(db, function (err) {
        if (err)
            return callback(err);
        callback(null, exports.glob.dbs[db]);
    });
}
exports.getDatabase = getDatabase;
function findEnum(type) {
    if (!type)
        return null;
    return _.find(exports.glob.enums, function (enm) {
        return enm._id.equals(type);
    });
}
exports.findEnum = findEnum;
function findEntity(id) {
    if (!id)
        return null;
    return _.find(exports.glob.entities, function (a) {
        return a._id.toString() == id.toString();
    });
}
exports.findEntity = findEntity;
function sort(list, sort) {
    _.each(sort.split(','), function (propertySort) {
        var descending = _.startsWith(propertySort, "-");
        var prop = propertySort.substr(1);
        list = _.sortBy(list, function (doc) {
            return doc[prop];
        });
        if (descending)
            list = list.reverse();
    });
    return list;
}
exports.sort = sort;
function getEnumItemName(enumName, val) {
    if (val === null)
        return null;
    var theEnum = _.find(exports.glob.enums, function (enm) {
        return enm.name === enumName;
    });
    if (!theEnum)
        return null;
    var item = _.find(theEnum.items, { value: val });
    return item ? item.name : "";
}
exports.getEnumItemName = getEnumItemName;
function initializeEnums(callback) {
    log('initializeEnums ...');
    exports.glob.enums = [];
    exports.glob.enumTexts = {};
    async.eachSeries(getEnabledPackages(), function (pack, next) {
        get(pack.name, types_1.SysCollection.enums, null, function (err, enums) {
            enums.forEach(function (theEnum) {
                theEnum._package = pack.name;
                exports.glob.enums.push(theEnum);
                var texts = {};
                _.sortBy(theEnum.items, "_z").forEach(function (item) {
                    texts[item.value] = item.title || item.name;
                });
                exports.glob.enumTexts[pack.name + "." + theEnum.name] = texts;
            });
            next();
        });
    }, callback);
}
exports.initializeEnums = initializeEnums;
function allObjects() {
    return _.filter(exports.glob.entities, { entityType: types_1.EntityType.Object });
}
exports.allObjects = allObjects;
function allFunctions() {
    return _.filter(exports.glob.entities, { entityType: types_1.EntityType.Function });
}
exports.allFunctions = allFunctions;
function allViews() {
    return _.filter(exports.glob.entities, { entityType: types_1.EntityType.View });
}
function initializeEntities(callback) {
    try {
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
        callback();
    }
    catch (ex) {
        exception(ex);
        callback();
    }
}
function initProperties(properties, entity, parentTitle) {
    if (!properties)
        return;
    for (var _i = 0, properties_1 = properties; _i < properties_1.length; _i++) {
        var prop = properties_1[_i];
        var sysProperty = _.find(exports.glob.systemProperties, { name: prop.name });
        if (sysProperty)
            _.defaultsDeep(prop, sysProperty);
        prop.group = prop.group || parentTitle;
        checkPropertyGtype(prop, entity);
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
    var parentNames = _.map(parentProperties, function (p) {
        return p.name;
    });
    _.filter(properties, function (p) {
        return parentNames.indexOf(p.name) == -1;
    }).forEach(function (newProperty) {
        checkPropertyReference(newProperty, entity);
    });
    for (var _i = 0, parentProperties_1 = parentProperties; _i < parentProperties_1.length; _i++) {
        var parentProperty = parentProperties_1[_i];
        var property = _.find(properties, { name: parentProperty.name });
        if (!property) {
            properties.push(parentProperty);
            continue;
        }
        _.defaultsDeep(property, parentProperty);
        if (property.referType == types_1.PropertyReferType.inlineData && property.type) {
            try {
                var propertyParentObject = findEntity(property.type);
                if (!propertyParentObject) {
                    error("(HandleSimilarProperty) Object '" + property.type + "' not found as property " + property.title + " reference.");
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
function aggergate(pack, objectName, query, callback) {
    var collection = exports.glob.dbs[pack].collection(objectName);
    return collection.aggregate(query).toArray(callback);
}
exports.aggergate = aggergate;
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
function getTypes(cn, done) {
    var objects = allObjects().map(function (ent) {
        var title = getText(cn, ent.title) + (cn.pack == ent._package ? "" : " (" + ent._package + ")");
        return { ref: ent._id, title: title };
    });
    var functions = allFunctions().map(function (ent) {
        var title = getText(cn, ent.title) + (cn.pack == ent._package ? "" : " (" + ent._package + ")");
        return { ref: ent._id, title: title };
    });
    var enums = exports.glob.enums.map(function (ent) {
        var title = getText(cn, ent.title) + (cn.pack == ent._package ? "" : " (" + ent._package + ")");
        return { ref: ent._id, title: title };
    });
    var types = objects.concat(functions, enums);
    types = _.orderBy(types, ['title']);
    var ptypes = [];
    for (var type in types_1.PType) {
        ptypes.push({ ref: new mongodb_1.ObjectId(types_1.PType[type]), title: getText(cn, type, true) });
    }
    types.unshift({ ref: "", title: "-" });
    types = ptypes.concat(types);
    done(null, types);
}
exports.getTypes = getTypes;
function getAllEntities(cn, done) {
    var entities = exports.glob.entities.map(function (ent) {
        var title = getText(cn, ent.title) + (cn.pack == ent._package ? "" : " (" + ent._package + ")");
        return { ref: ent._id, title: title };
    });
    entities = _.orderBy(entities, ['title']);
    done(null, entities);
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
function getPropertyReferenceValues(cn, prop, instance, done) {
    if (prop._enum) {
        var items = _.map(prop._enum.items, function (item) {
            return { ref: item.value, title: getText(cn, item.title) };
        });
        return done(null, items);
    }
    var entity = findEntity(prop.type);
    if (!entity) {
        error("Property '" + prop.name + "' type '" + prop.type + "' not found.");
        return done(types_1.StatusCode.NotFound, null);
    }
    if (entity.entityType == types_1.EntityType.Object)
        return get(cn.pack, entity.name, { count: 10 }, function (err, result) {
            if (result) {
                var items = _.map(result, function (item) {
                    return { ref: item._id, title: getText(cn, item.title) };
                });
                done(null, items);
            }
        });
    else if (entity.entityType == types_1.EntityType.Function) {
        var typeFunc = entity;
        var args = [];
        if (typeFunc.parameters)
            for (var _i = 0, _a = typeFunc.parameters; _i < _a.length; _i++) {
                var param = _a[_i];
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
        return invoke(cn, typeFunc, args, done);
    }
    done(null, null);
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
function mock(cn, func, args, done) {
    log("mocking function '" + cn.pack + "." + func.name + "' ...");
    if (!func.test.samples || !func.test.samples.length)
        return done({ code: types_1.StatusCode.Ok, message: "No sample data!" });
    var withInputs = func.test.samples.filter(function (sample) {
        return sample.input;
    });
    for (var _i = 0, withInputs_1 = withInputs; _i < withInputs_1.length; _i++) {
        var sample = withInputs_1[_i];
        if (mockCheckMatchInput(cn, func, args, sample)) {
            var err = null;
            if (sample.code)
                err = { code: sample.code, message: sample.message };
            return done(err, sample.result);
        }
    }
    var withoutInput = _.find(func.test.samples, function (sample) {
        return !sample.input;
    });
    if (withoutInput) {
        var err = null;
        if (withoutInput.code)
            err = { code: withoutInput.code, message: withoutInput.message };
        return done(err, withoutInput.result);
    }
    return done({ code: types_1.StatusCode.Ok, message: "No default sample data!" });
}
exports.mock = mock;
function invoke(cn, func, args, done) {
    try {
        if (func.test && func.test.mock && envMode() == types_1.EnvMode.Development && cn.url.pathname != "/functionTest") {
            mock(cn, func, args, done);
            return;
        }
        var action = require("../" + func._package + "/main")[func.name];
        if (!action) {
            if (func._package == types_1.Constants.sysPackage)
                action = require("../web/main")[func.name];
            if (!action) {
                var app = _.find(exports.glob.apps, { _package: cn.pack });
                for (var _i = 0, _a = app.dependencies; _i < _a.length; _i++) {
                    var pack = _a[_i];
                    action = require("../" + pack + "/main")[func.name];
                    if (action)
                        break;
                }
            }
        }
        if (!action)
            return done("Function'" + func.name + "'notfound.");
        var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
        var ARGUMENT_NAMES = /([^\s,]+)/g;
        var fnStr = action.toString().replace(STRIP_COMMENTS, '');
        var argNames = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);
        if (argNames === null)
            argNames = [];
        if (args.length == 0)
            return action(cn, done);
        else
            return action.apply(void 0, __spreadArrays([cn], args, [done]));
    }
    catch (ex) {
        if (ex.message == func.name + " is not defined") {
            todo(ex.message);
            done(types_1.StatusCode.NotImplemented);
        }
        else {
            exception(ex);
            done(ex.message);
        }
    }
}
exports.invoke = invoke;
function runFunction(cn, functionId, input, done) {
    var func = findEntity(functionId);
    if (!func)
        return done(types_1.StatusCode.NotFound);
    input = input || {};
    var args = [];
    if (func.parameters)
        for (var _i = 0, _a = func.parameters; _i < _a.length; _i++) {
            var para = _a[_i];
            args.push(input[para.name]);
        }
    invoke(cn, func, args, function (err, result) {
        done(err, result, func);
    });
}
exports.runFunction = runFunction;
//# sourceMappingURL=main.js.map