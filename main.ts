import logger = require('winston');
import mongodb = require('mongodb');
import xmlBuilder = require('xmlbuilder');
import fs = require('fs-extra');
import path = require('path');
import moment = require('moment');
import _ = require('lodash');
import async = require('async');
import graphlib = require('graphlib');
import Jalali = require('jalali-moment');
import AWS = require('aws-sdk');
import {MongoClient, ObjectId} from 'mongodb';
import {
	App,
	AuditArgs,
	AuditType,
	SystemConfig,
	SystemConfigPackage,
	Constants,
	Context,
	DelOptions,
	Drive,
	Entity,
	EntityType,
	Enum,
	EnumItem,
	EnvMode,
	Function,
	FunctionTestSample,
	GetOptions,
	GlobalType,
	Locale,
	LogLevel,
	Global,
	Menu,
	mObject,
	ObjectModifyState,
	ObjectModifyType,
	PackageConfig,
	Pair,
	Property,
	PropertyReferType,
	PType,
	PutOptions,
	RefPortion,
	RefPortionType,
	Role,
	SourceType,
	StatusCode,
	SysAuditTypes,
	SysCollection,
	SystemProperty,
	Text,
	View,
} from './types';

const {EJSON} = require('bson');

export let glob = new Global();

export function reload(cn: Context, done: (err) => void) {
	let startTime = moment();
	log(`reload ...`);
	async.series([
		loadSysConfig,
		loadSystemCollections,
		loadGeneralCollections,
		loadAuditTypes,
		initializeEnums,
		initializePackages,
		initializeRoles,
		initializeEntities
	], (err) => {
		let period = moment().diff(startTime, 'ms', true);
		info(`reload done in '${period}' ms.`);
		done(err);
	});
}

export function start(callback: (err, glob: Global) => void) {
	process.on('uncaughtException', function (err) {
		audit(SysAuditTypes.uncaughtException, {level: LogLevel.Emerg, comment: err.message + ". " + err.stack});
	});

	process.on('unhandledRejection', (reason, p) => {
		audit(SysAuditTypes.unhandledRejection, {level: LogLevel.Emerg, detail: reason});
	});

	configureLogger(false);

	reload(null, (err) => {
		callback(err, glob);
	});
}

function isWindows() {
	return /^win/.test(process.platform);
}

export function audit(auditType: string, args: AuditArgs) {
	args.type = args.type || new ObjectId(auditType);
	args.time = new Date();
	let comment = args.comment || "";
	let type = _.find(glob.auditTypes, (type: AuditType) => {
		return type._id.equals(args.type)
	});
	let msg = "audit(" + (type ? type.name : args.type) + "): " + comment;

	switch (args.level) {
		case LogLevel.Emerg:
			emerg(msg);
			break;
		case LogLevel.Error:
			error(msg);
			break;
		case LogLevel.Notice:
			notice(msg);
			break;
		case LogLevel.Info:
			info(msg);
			break;
		case LogLevel.Warning:
			warn(msg);
			break;
	}

	if (type && type.disabled) return;
	put(args.pack || Constants.sysPackage, SysCollection.audits, args);
}

export function run(cn, func: string, ...args) {
	try {
		let theFunction = eval(_.camelCase(func));
		theFunction(cn, ...args);
	} catch (err) {
		warn(`[exe] ${func}`);
	}
}

/**
 * Gets or Queries from an object source
 * @param pack - packages name, e.g. 'sys'
 * @param objectName - name of the object to retrieve
 * @param options:
 *          itemId?: ObjectId;
 *          query?: any;
 *          count?: number;
 *          skip?: number;
 *          sort?: any;
 *          last?: boolean;
 */
export function get(pack: string, objectName: string, options: GetOptions, done: (err, result?) => void) {
	let db = glob.dbs[pack];
	if (!db) return done(`db for pack '${pack}' not found.`, null);
	options = options || {} as GetOptions;
	let collection = db.collection(objectName);

	if (options.itemId)
		collection.findOne(options.itemId, done);
	else {
		let find = collection.find(options.query);
		if (options.sort) find = find.sort(options.sort);
		if (options.last) find = find.sort({$natural: -1});
		if (options.count) find = find.limit(options.count);
		if (options.skip) find = find.skip(options.skip);
		find.toArray((err, result) => {
			if (options.count === 1 && result)
				done(null, result[0]);
			else
				done(err, result);
		});
	}
}

export function put(pack: string, objectName: string, item: any, options?: PutOptions, done?: (status: StatusCode, result?: ObjectModifyState) => void) {
	let collection = glob.dbs[pack].collection(objectName);
	done = done || (() => {
	});
	if (!collection) return done(StatusCode.BadRequest);

	item = item || {};
	if (!options || !options.portions || options.portions.length == 1) {
		if (item._id)
			collection.replaceOne({_id: item._id}, item, (err, result) => {
				if (err) {
					error(err);
					done(StatusCode.ServerError);
				} else {
					done((result && result.modifiedCount) ? StatusCode.Ok : StatusCode.ResetContent, {
						type: ObjectModifyType.Update,
						item: item,
						itemId: item._id
					});
				}
			});
		else
			collection.insertOne(item, (err, result) => {
				if (err) {
					error(err);
					done(StatusCode.ServerError);
				} else {
					done((result && result.insertedCount) ? StatusCode.Ok : StatusCode.ResetContent, {
						type: ObjectModifyType.Insert,
						item: item,
						itemId: item._id
					});
				}
			});
		return;
	}

	let portions = options.portions;
	switch (portions.length) {
		case 2: // Update new root item
			collection.save(item, (err, result) => {
				if (err) {
					error(err);
					done(StatusCode.ServerError);
				} else {
					done((result && result.insertedCount) ? StatusCode.Ok : StatusCode.ResetContent, {
						type: ObjectModifyType.Update,
						item: item,
						itemId: item._id
					});
				}
			});
			break;

		default: // Insert / Update not root item
			let command = {$addToSet: {}};
			item._id = item._id || new ObjectId();
			let rootId = portions[1].itemId;
			portionsToMongoPath(pack, rootId, portions, portions.length, (err, path: string) => {
				command.$addToSet[path] = item;
				collection.updateOne({_id: rootId}, command, (err, result) => {
					if (err) {
						error(err);
						done(StatusCode.ServerError);
					} else {
						done((result && result.modifiedCount) ? StatusCode.Ok : StatusCode.ResetContent, {
							type: ObjectModifyType.Patch,
							item: item,
							itemId: rootId
						});
					}
				});
			});
			break;
	}
}

export function portionsToMongoPath(pack: string, rootId: ObjectId, portions: RefPortion[], endIndex: number, done: (err: StatusCode, path?: string) => void) {
	if (endIndex == 3) // not need to fetch data
		return done(null, portions[2].property.name);

	let collection = glob.dbs[pack].collection(portions[0].value);
	if (!collection) return done(StatusCode.BadRequest);

	collection.findOne({_id: rootId}, (err, item) => {
		let value = item;
		if (err || !value) return done(err || StatusCode.ServerError);

		let path = "";
		for (let i = 2; i < endIndex; i++) {
			let part = portions[i].value;
			if (portions[i].type == RefPortionType.property) {
				path += "." + part;
				value = value[part];
				if (value == null)
					value = {}; // sample: access.items
			} else {
				let partItem = _.find(value, (it) => {
					return it._id && it._id.toString() == part;
				});
				if (!partItem) return done(StatusCode.ServerError);
				path += "." + value.indexOf(partItem);
				value = partItem;
			}
		}
		done(null, _.trim(path, '.'));
	});
}

export function count(pack: string, objectName: string, options: GetOptions, done: (count) => void) {
	get(pack, objectName, options, (err, result) => {
		if (err) return done(null);
		let count = !result ? 0 : (Array.isArray(result) ? result.length : 1);
		done(count);
	});
}

export function extractRefPortions(pack: string, appDependencies: string[], ref: string, _default?: string): RefPortion[] {
	try {
		ref = _.trim(ref, '/') || _default;
		if (!ref)
			return null;

		let portions: RefPortion[] = _.map(ref.split('/'), (portion) => {
			return {value: portion} as RefPortion;
		});

		if (portions.length === 0) return null;

		for (let i = 1; i < portions.length; i++) {
			portions[i].pre = portions[i - 1];
		}

		let entity: Entity = _.find(glob.entities, (entity) => {
			return entity._id.toString() === portions[0].value
		});
		if (!entity)
			entity = _.find(glob.entities, {_package: pack, name: portions[0].value});
		if (!entity)
			entity = _.find(glob.entities, (entity) => {
				return entity.name === portions[0].value && appDependencies.indexOf(entity._package) > -1;
			});

		if (entity) {
			portions[0].entity = entity;
			portions[0].type = RefPortionType.entity;
		} else
			return null;

		if (entity.entityType !== EntityType.Object || portions.length < 2)
			return portions;

		let parent: any = entity;

		for (let i = 1; i < portions.length; i++) {
			let pr = portions[i];
			if (parent == null) {
				warn(`Invalid path '${ref}'`);
				return null;
			} else if (parent._gtype == GlobalType.file) {
				pr.type = RefPortionType.file;
			} else if ((parent.entityType || parent.isList) && /[0-9a-f]{24}/.test(pr.value)) {
				pr.type = RefPortionType.item;
				let itemId = pr.value;
				pr.itemId = new ObjectId(itemId);
			} else {
				pr.type = RefPortionType.property;
				parent = pr.property = _.find(parent.properties, {name: pr.value});
				if (!pr.property)
					error(`Invalid property name '${pr.value}' in path '${ref}'`);
			}
		}

		return portions;
	} catch (ex) {
		exception(ex);
	}
}

export function patch(pack: string, objectName: string, patchData: any, options?: PutOptions, done?: (status: StatusCode, result?: ObjectModifyState) => void) {
	let collection = glob.dbs[pack].collection(objectName);
	done = done || (() => {
	});
	if (!collection) return done(StatusCode.BadRequest);

	if (!options) options = {portions: []};
	let portions = options.portions;
	if (!portions)
		portions = [{type: RefPortionType.entity, value: objectName} as RefPortion];

	if (portions.length == 1)
		return done(StatusCode.BadRequest);

	let rootId = portions.length < 2 ? patchData._id : portions[1].itemId;
	portionsToMongoPath(pack, rootId, portions, portions.length, (err, path: string) => {
		let command = {$set: {}, $unset: {}};
		if (portions[portions.length - 1].property && portions[portions.length - 1].property._gtype == GlobalType.file)
			command["$set"][path] = patchData; // e.g. multiple values for files in 'tests' object
		else
			for (let key in patchData) {
				if (key == "_id") continue;
				command[patchData[key] == null ? "$unset" : "$set"][path + (path ? "." : "") + key] = patchData[key];
			}

		if (_.isEmpty(command.$unset)) delete command.$unset;
		if (_.isEmpty(command.$set)) delete command.$set;

		let rootId = portions[1].itemId;
		collection.updateOne({_id: rootId}, command, (err, result) => {
			if (err) {
				error(err);
				done(StatusCode.ServerError);
			} else {
				done((result && result.modifiedCount) ? StatusCode.Ok : StatusCode.ResetContent, {
					type: ObjectModifyType.Patch,
					item: patchData,
					itemId: rootId
				});
			}
		});
	});
}

export function del(pack: string, objectName: string, options?: DelOptions, done?: (status: StatusCode, result?: ObjectModifyState) => void) {
	let collection = glob.dbs[pack].collection(objectName);
	if (!collection || !options) return done(StatusCode.BadRequest);

	if (options.itemId)
		return collection.deleteOne({_id: options.itemId}, (err, result) => {
			if (err) {
				error(err);
				done(StatusCode.ServerError);
			} else {
				done((result && result.deletedCount) ? StatusCode.Ok : StatusCode.ResetContent, {
					type: ObjectModifyType.Delete,
					item: null,
					itemId: options.itemId
				});
			}
		});


	let portions = options.portions;
	if (portions.length == 1 || portions.length == 3)
		return done(StatusCode.BadRequest);

	switch (portions.length) {
		case 2: // Delete root item
			collection.deleteOne({_id: portions[1].itemId}, (err, result) => {
				if (err) {
					error(err);
					done(StatusCode.ServerError);
				} else {
					done((result && result.deletedCount) ? StatusCode.Ok : StatusCode.ResetContent, {
						type: ObjectModifyType.Delete,
						item: null,
						itemId: portions[1].itemId
					});
				}
			});
			break;

		default: // Delete nested property item
			let command = {$pull: {}};
			let rootId = portions[1].itemId;
			let itemId = portions[portions.length - 1].itemId;

			portionsToMongoPath(pack, rootId, portions, portions.length - 1, (err, path: string) => {
				command.$pull[path] = {_id: itemId};
				collection.updateOne({_id: rootId}, command, (err, result) => {
					if (err) {
						error(err);
						done(StatusCode.ServerError);
					} else {
						done((result && result.modifiedCount) ? StatusCode.Ok : StatusCode.ResetContent, {
							type: ObjectModifyType.Patch,
							item: null,
							itemId: rootId
						});
					}
				});
			});
			break;
	}
}

export function getFile(drive: Drive, filePath: string, done: (err: StatusCode, file?) => void) {
	switch (drive.type) {
		case SourceType.File:
			let _path = path.join(drive.address, filePath);
			fs.readFile(_path, (err, file) => {
				if (err) error(err);
				if (!file) return done(StatusCode.NotFound);
				done(null, file);
			});
			break;

		case SourceType.Db:
			let db = glob.dbs[drive._package];
			let bucket = new mongodb.GridFSBucket(db);
			let stream = bucket.openDownloadStreamByName(filePath);
			let data: Buffer;
			stream.on("end", function () {
				return done(null, data);
			}).on("data", function (chunk: Buffer) {
				data = data ? Buffer.concat([data, chunk]) : chunk;
			}).on("error", function (err) {
				error(err);
				return done(StatusCode.NotFound);
			});
			break;

		default:
			return done(StatusCode.NotImplemented);
	}
}

export function putFile(host: string, drive: Drive, filePath: string, file: Buffer, done: (err?: StatusCode, result?) => void) {
	switch (drive.type) {
		case SourceType.File:
			let _path = path.join(drive.address, filePath);
			fs.mkdir(path.dirname(_path), {recursive: true}, (err) => {
				if (err) return done(err);
				fs.writeFile(_path, file, (err) => {
					if (err) error(err);
					done(err ? StatusCode.ServerError : StatusCode.Ok);
				});
			});
			break;

		case SourceType.Db:
			let db = glob.dbs[host];
			let bucket = new mongodb.GridFSBucket(db);
			let stream = bucket.openUploadStream(filePath);
			delFile(host, filePath, () => {
				stream.on("error", function (err) {
					error(err);
					done(err ? StatusCode.ServerError : StatusCode.Ok);
				}).end(file, done);
			});
			break;

		case SourceType.S3:
			if (!glob.sysConfig.amazon || !glob.sysConfig.amazon.accessKeyId) {
				error('s3 accessKeyId, secretAccessKey is required in sysConfig!');
				return done(StatusCode.SystemConfigurationProblem);
			}

			AWS.config.accessKeyId = glob.sysConfig.amazon.accessKeyId;
			AWS.config.secretAccessKey = glob.sysConfig.amazon.secretAccessKey;
			let s3 = new AWS.S3({apiVersion: Constants.amazonS3ApiVersion});
			s3.upload({Bucket: drive.address, Key: path.basename(filePath), Body: file}, function (err, data) {
				if (err || !data) {
					error(err || "s3 upload failed");
					done(StatusCode.ServerError);
				} else
					done(null, {url: data.Location});
			});
			break;

		default:
			return done(StatusCode.NotImplemented);
	}
}

export function getFileInfo(host: string, filePath: string, done: (err: StatusCode, info?: File) => void) {
	// let rep: repository = mem.sources[host];
	// if (!rep) return done(statusCode.notFound);
	//
	// switch (rep.type) {
	//   case objectSource.fileSystem:
	//     fs.stat(path.join(rep.sourceAddress, filePath), (err, stats) => {
	//       if (err) return done(statusCode.notFound);
	//
	//       let info = {
	//         _id: new ObjectId(),
	//         name: filePath,
	//         length: stats.size,
	//       } as file;
	//       done(null, info);
	//     });
	//     break;
	//
	//   case objectSource.db:
	//     const FILES_COLL = 'fs.files';
	//     let db = mem.dbs[rep._package];
	//     db.collection(FILES_COLL).findOne({filename: filePath}, (err, info: FileInfo) => {
	//       if (err || !info) return done(statusCode.notFound);
	//       let file: file = {
	//         _id: info._id,
	//         name: info.filename.replace(/^__?[a-zA-Z\d]+__?/g, ""),
	//         length: info.length
	//       };
	//       done(null, file);
	//     });
	//     break;
	//
	//   default:
	//     return done(statusCode.notImplemented);
	// }
}

export function delFile(host: string, filePath: string, done: (err: StatusCode) => void) {
	// let rep: repository = mem.sources[host];
	// if (!rep) return done(statusCode.notFound);
	//
	// switch (rep.type) {
	//   case objectSource.fileSystem:
	//     fs.unlink(path.join(rep.sourceAddress, filePath), (err) => {
	//       if (err) error(err);
	//       done(err ? statusCode.serverError : statusCode.Ok);
	//     });
	//     break;
	//
	//   case objectSource.db:
	//     getFileInfo(host, filePath, (err, info: file) => {
	//       if (err) return done(err);
	//
	//       let db = mem.dbs[rep._package];
	//       let bucket = new mongodb.GridFSBucket(db);
	//       bucket.delete(info._id, (err) => {
	//         done(err ? statusCode.notFound : statusCode.Ok);
	//       });
	//     });
	//     break;
	//
	//   default:
	//     return done(statusCode.notImplemented);
	// }
}

export function movFile(host: string, sourcePath: string, targetPath: string, done: (err: StatusCode) => void) {
	// todo('movFile: pseudocode!');
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
	//     let db = mem.dbs[rep._package];
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

export function authorizeUser(email: string, password: string, done) {

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

export function notice(message) {
	logger.log('notice', message);
}

export function warn(...message) {
	logger.warn(message);
}

export function error(...message) {
	logger.error(message);
}

export function todo(message) {
	logger.log('todo', '#ToDo: ' + message);
}

export function exception(err) {
	logger.log("crit", err.stack || err.message || err);
}

export function emerg(message) {
	logger.log('emerg', message);
	logger.error("terminating process ...");
	setTimeout(() => {
		process.exit();
	}, 2000);
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

function loadGeneralCollections(done) {
	log('loadGeneralCollections ...');

	get(Constants.sysPackage, Constants.timeZonesCollection, null, (err, timeZones) => {
		glob.timeZones = timeZones;

		get(Constants.sysPackage, SysCollection.objects, {
			query: {name: Constants.systemPropertiesObjectName},
			count: 1
		}, (err, result: mObject) => {
			if (!result)
				emerg('systemProperties object not found!');
			glob.systemProperties = result ? result.properties : [];
			done();
		});
	});
}

function loadAuditTypes(done) {
	log('loadAuditTypes ...');

	get(Constants.sysPackage, SysCollection.auditTypes, null, (err, auditTypes) => {
		glob.auditTypes = auditTypes;
		done();
	});
}

function getEnabledPackages(): SystemConfigPackage[] {
	return glob.sysConfig.packages.filter((pack) => {
		return pack.enabled;
	});
}

function loadSysConfig(done) {
	connect(Constants.sysPackage, (err) => {
		if (err) return done(err);

		glob.dbs[Constants.sysPackage].collection(SysCollection.systemConfig).findOne({}, (err, config: SystemConfig) => {
			glob.sysConfig = config;
			for (let pack of getEnabledPackages()) {
				glob.packages[pack.name] = require(`../${pack.name}/main`);
				if (glob.packages[pack.name] == null)
					error(`Error loading package ${pack.name}!`);
				else {
					let p = require(`../${pack.name}/package.json`);
					glob.packages[pack.name]._version = p.version;
					log(`package '${pack.name}' loaded. version: ${p.version}`);
				}
			}
			done();
		});
	});
}

function loadSystemCollections(done) {
	glob.entities = [];
	glob.dictionary = {};
	glob.menus = [];
	glob.roles = [];
	glob.drives = [];

	if (!process.env.DB_ADDRESS)
		return done("Environment variable 'DB_ADDRESS' is needed!");

	async.eachSeries(getEnabledPackages(), (packConfig, nextPackage) => {
		let pack = packConfig.name;
		connect(pack, (err) => {
			if (err) return nextPackage();

			log(`Loading system collections package '${pack}' ...`);
			async.series([
				(next) => {
					glob.dbs[pack].collection(SysCollection.configs).findOne(null, (err, config: PackageConfig) => {
						if (!config) {
							packConfig.enabled = false;
							error(`Config for package '${pack}' not found!`);
						} else
							glob.packages[pack]._config = config;
						next();
					});
				},
				(next) => {
					glob.dbs[pack].collection(SysCollection.objects).find({}).toArray((err, objects: mObject[]) => {
						for (let object of objects) {
							object._package = pack;
							object.entityType = EntityType.Object;
							glob.entities.push(object);
						}
						next();
					});
				},
				(next) => {
					glob.dbs[pack].collection(SysCollection.functions).find({}).toArray((err, functions: Function[]) => {
						for (let func of functions) {
							func._package = pack;
							func.entityType = EntityType.Function;
							glob.entities.push(func);
						}
						next();
					});
				},
				(next) => {
					glob.dbs[pack].collection(SysCollection.views).find({}).toArray((err, views: View[]) => {
						for (let view of views) {
							view._package = pack;
							view.entityType = EntityType.View;
							glob.entities.push(view);
						}
						next();
					});
				},
				(next) => {
					glob.dbs[pack].collection(SysCollection.dictionary).find({}).toArray((err, texts: Text[]) => {
						for (let item of texts) {
							glob.dictionary[pack + "." + item.name] = item.text;
						}
						next();
					});
				},
				(next) => {
					glob.dbs[pack].collection(SysCollection.menus).find({}).toArray((err, menus: Menu[]) => {
						for (let menu of menus) {
							menu._package = pack;
							glob.menus.push(menu);
						}
						next();
					});
				},
				(next) => {
					glob.dbs[pack].collection(SysCollection.roles).find({}).toArray((err, roles: Role[]) => {
						for (let role of roles) {
							role._package = pack;
							glob.roles.push(role);
						}
						next();
					});
				},
				(next) => {
					glob.dbs[pack].collection(SysCollection.drives).find({}).toArray((err, drives: Drive[]) => {
						for (let drive of drives) {
							drive._package = pack;
							glob.drives.push(drive);
						}
						next();
					});
				}
			], nextPackage);
		});

	}, done);
}

export function configureLogger(silent: boolean) {
	let logDir = path.join(__dirname, '../logs');
	const infoLogFileName = 'info.log';
	const errorLogFileName = 'error.log';
	const logLevels = {
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

	let transports: any[] = [
		new logger.transports.File(
			{
				filename: path.join(logDir, errorLogFileName),
				// maxsize: mem.sysConfig.log.maxSize,
				level: 'error',
				format: logger.format.printf(info => `${moment().format('HH:mm:ss.SS')}  ${info.level}\t${info.message}`),
			}),
		new logger.transports.File(
			{
				filename: path.join(logDir, infoLogFileName),
				// maxsize: mem.sysConfig.log.maxSize,
				level: 'debug',
				format: logger.format.printf(info => `${moment().format('HH:mm:ss.SS')}  ${info.level}\t${info.message}`),
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

function validateApp(pack: string, app: App): boolean {
	if (!app.defaultTemplate) {
		warn(`app.defaultTemplate is required for package '${pack}'`);
		return false;
	}

	return true;
}

export function initializeRoles(done) {
	let g = new graphlib.Graph();
	for (let role of glob.roles) {
		g.setNode(role._id.toString());
		for (let subRole of role.roles || []) {
			g.setEdge(role._id.toString(), subRole.toString());
		}
	}

	for (let role of glob.roles) {
		let result = graphlib.alg.postorder(g, role._id.toString());
		role.roles = result.map((item) => {
			return new ObjectId(item);
		});
	}

	done();
}

function checkAppMenu(app: App) {
	if (app.menu) {
		app._menu = _.find(glob.menus, (menu: Menu) => {
			return menu._id.equals(app.menu);
		});
	} else { // return the first found menu in the app
		app._menu = _.find(glob.menus, (menu: Menu) => {
			return menu._package == app._package;
		});
	}

	if (!app._menu)
		warn(`Menu for app '${app.title}' not found!`);
}

function initializePackages(done) {
	log(`initializePackages: ${JSON.stringify(glob.sysConfig.packages)}`);
	glob.apps = [];
	getEnabledPackages().forEach((pack) => {
		let config = glob.packages[pack.name]._config;
		for (let app of (config.apps || [])) {
			app._package = pack.name;
			app.dependencies = app.dependencies || [];
			app.dependencies.push(Constants.sysPackage);
			checkAppMenu(app);
			if (validateApp(pack.name, app)) {
				glob.apps.push(app);
				let host = glob.sysConfig.hosts.filter((host) => {
					return host.app.equals(app._id);
				}).pop();
				if (host) host._app = app;
			}
		}
	});

	done();
}

function checkPropertyGtype(prop: Property, entity: Entity) {
	if (!prop.type) {
		if (prop.properties && prop.properties.length) {
			prop._gtype = GlobalType.object;
			return;
		} else {
			warn(`property '${entity._package}.${entity.name}.${prop.name}' type is empty!`);
			return;
		}
	}

	switch (prop.type.toString()) {
		case PType.boolean:
			prop._gtype = GlobalType.boolean;
			return;

		case PType.text:
			prop._gtype = GlobalType.string;
			return;

		case PType.number:
			prop._gtype = GlobalType.number;
			return;

		case PType.location:
			prop._gtype = GlobalType.location;
			return;

		case PType.time:
			prop._gtype = GlobalType.time;
			return;

		case PType.file:
			prop._gtype = GlobalType.file;
			return;

		case PType.reference:
			prop._gtype = GlobalType.object;
			return;

		case PType.obj:
			prop._gtype = GlobalType.object;
			// when type is object, always it will be edited by 'document-editor'
			prop.documentView = true;
			return;
	}

	prop._isRef = true;
	prop._enum = findEnum(prop.type);
	if (prop._enum) {
		prop._gtype = GlobalType.number;
		return;
	}

	let type = findEntity(prop.type);
	if (type == null) {
		prop._gtype = GlobalType.unknown;
		warn(`Property '${prop.name}' invalid type '${prop.type}' not found. entity: ${entity.name}!`);
		return;
	}

	if (type.entityType == EntityType.Function) {
		let func = type as Function;
		if (func.returnType && func.returnType.toString() == PType.text)
			prop._gtype = GlobalType.string;
		else
			prop._gtype = GlobalType.id;
	} else {
		let refType = prop.referType;
		if (!refType)
			refType = prop.type ? PropertyReferType.select : PropertyReferType.inlineData;

		switch (refType) {
			case PropertyReferType.select:
				prop._gtype = GlobalType.id;
				break;

			case PropertyReferType.outbound:
				prop._isRef = false;
				prop._gtype = GlobalType.object;
				break;

			case PropertyReferType.inlineData:
				prop._isRef = false;
				prop._gtype = GlobalType.object;
				break;
		}
	}
}

export function connect(dbName: string, callback) {
	try {
		//log("Connect to database {0} ...", dbName);
		if (glob.dbs[dbName]) return callback();

		if (!process.env.DB_ADDRESS) {
			return callback("Environment variable 'DB_ADDRESS' is needed.");
		}

		let url = process.env.DB_ADDRESS.replace(/admin/, dbName);
		MongoClient.connect(url, {useNewUrlParser: true, useUnifiedTopology: true} as any, function (err, dbc) {
			if (err) {
				error('Unable to connect to the mongoDB server. Error:' + err);
				callback(err);
			} else {
				//log("Connection to database {0} established.", dbName);
				glob.dbs[dbName] = dbc.db(dbName);
				callback();
			}
		});
	} catch (ex) {
		exception(ex);
		callback(ex.message);
	}
}

export function getDatabase(db: string, callback: (err, db?: mongodb.Db) => void) {
	if (glob.dbs[db]) return callback(null, glob.dbs[db]);

	connect(db, function (err) {
		if (err) return callback(err);
		callback(null, glob.dbs[db]);
	});
}

export function findEnum(type: ObjectId): Enum {
	if (!type) return null;
	return _.find(glob.enums, (enm: Enum) => {
		return enm._id.equals(type);
	});
}

export function findEntity(id: ObjectId): Entity {
	if (!id) return null;
	return _.find(glob.entities, function (a: any) {
		return a._id.toString() == id.toString()
	});
}

export function sort(list, sort) {
	_.each(sort.split(','), function (propertySort) {
		let descending = _.startsWith(propertySort, "-");
		let prop = propertySort.substr(1);

		list = _.sortBy(list, function (doc) {
			return doc[prop]
		});
		if (descending)
			list = list.reverse();
	});
	return list;
}

export function getEnumItemName(enumName: string, val: number): string {
	if (val === null) return null;

	let theEnum = _.find(glob.enums, (enm: Enum) => {
		return enm.name === enumName
	});

	if (!theEnum) return null;
	let item = _.find(theEnum.items, {value: val});
	return item ? item.name : "";
}

export function initializeEnums(callback) {
	log('initializeEnums ...');
	glob.enums = [];
	glob.enumTexts = {};

	async.eachSeries(getEnabledPackages(), (pack: SystemConfigPackage, next) => {
		get(pack.name, SysCollection.enums, null, (err, enums: Enum[]) => {
			enums.forEach((theEnum) => {
				theEnum._package = pack.name;
				glob.enums.push(theEnum);

				let texts = {};
				_.sortBy(theEnum.items, "_z").forEach((item) => {
					texts[item.value] = item.title || item.name;
				});
				glob.enumTexts[pack.name + "." + theEnum.name] = texts;
			});
			next();
		});
	}, callback);
}

export function allObjects(): mObject[] {
	return _.filter(glob.entities, {entityType: EntityType.Object}) as any[];
}

export function allFunctions(): Function[] {
	return _.filter(glob.entities, {entityType: EntityType.Function}) as any[];
}

function allViews(): View[] {
	return _.filter(glob.entities, {entityType: EntityType.View}) as any[];
}

function initializeEntities(callback) {
	try {
		log(`Initializing '${allObjects().length}' Objects ...`);
		let allObjs = allObjects();
		for (let obj of allObjs) {
			initObject(obj);
		}

		log(`Initializing '${allFunctions().length}' functions ...`);
		for (let func of allFunctions()) {
			try {
				func._access = {};
				func._access[func._package] = func.access;
				initProperties(func.parameters, func, func.title);
			} catch (ex) {
				exception(ex);
				error("Init functions, Module: " + func._package + ", Action: " + func.name);
			}
		}

		callback();
	} catch (ex) {
		exception(ex);
		callback();
	}
}

// export function getPropReferType(prop: Property): PropertyReferType {
// 	if (prop._gtype != GlobalType.object) return null;
// 	else if (prop.referType) return prop.referType;
// 	else return prop.type ? PropertyReferType.select : PropertyReferType.inlineData;
// }

export function initProperties(properties: Property[], entity: Entity, parentTitle?) {
	if (!properties) return;
	for (let prop of properties) {
		let sysProperty: Property = _.find(glob.systemProperties, {name: prop.name});
		if (sysProperty)
			_.defaultsDeep(prop, sysProperty);

		prop.group = prop.group || parentTitle;
		checkPropertyGtype(prop, entity);
		initProperties(prop.properties, entity, prop.title);
	}
}

export function initObject(obj: mObject) {
	try {
		if (obj._inited)
			return;
		else
			obj._inited = true;

		obj.properties = obj.properties || [];
		obj._autoSetInsertTime = _.some(obj.properties, {name: SystemProperty.time});
		obj._access = {};
		obj._access[obj._package] = obj.access;
		initProperties(obj.properties, obj);

		if (obj.reference) {
			let referenceObj = findEntity(obj.reference) as mObject;
			if (!referenceObj)
				return warn(`SimilarObject in service '${obj._package}' not found for object: '${obj.title}', SimilarObjectID:${obj.reference}`);

			initObject(referenceObj);

			_.defaultsDeep(obj, referenceObj);
			compareParentProperties(obj.properties, referenceObj.properties, obj);
		} else if (obj.properties) {
			for (let prop of obj.properties) {
				checkPropertyReference(prop, obj);
			}
		}
	} catch (ex) {
		exception(ex);
		error(`initObject, Error in object ${obj._package}.${obj.name}`);
	}
}

function checkPropertyReference(property: Property, entity: Entity) {
	if (property._gtype == GlobalType.object && (!property.properties || !property.properties.length)) {
		let propertyParentObject = findEntity(property.type) as mObject;
		if (!propertyParentObject) {
			if (property._gtype == GlobalType.object) return;
			return error(`Property '${entity._package}.${entity.name}.${property.name}' type '${property.type}' not found.`);
		}

		initObject(propertyParentObject);

		property.properties = property.properties || [];
		if (!property._parentPropertiesCompared) {
			property._parentPropertiesCompared = true;
			compareParentProperties(property.properties, propertyParentObject.properties, entity);
		}
	} else if (property.properties)
		for (let prop of property.properties) {
			checkPropertyReference(prop, entity);
		}
}

function compareParentProperties(properties: Property[], parentProperties: Property[], entity: Entity) {
	if (!parentProperties)
		return;

	let parentNames = _.map(parentProperties, function (p) {
		return p.name;
	});
	_.filter(properties, function (p) {
		return parentNames.indexOf(p.name) == -1
	}).forEach(function (newProperty) {
		checkPropertyReference(newProperty, entity);
	});

	for (let parentProperty of parentProperties) {
		let property: Property = _.find(properties, {name: parentProperty.name});
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

				if (!propertyParentObject._inited)
					initObject(propertyParentObject);

				if (!property._parentPropertiesCompared) {
					property._parentPropertiesCompared = true;
					compareParentProperties(property.properties, propertyParentObject.properties, entity);
				}
			} catch (ex) {
				exception(ex);
			}
		} else {
			if ((parentProperty.properties && parentProperty.properties.length > 0) && !property.group)
				property.group = property.title;

			if (!property._parentPropertiesCompared) {
				property._parentPropertiesCompared = true;
				compareParentProperties(property.properties, parentProperty.properties, entity);
			}
		}
	}
}

export function getEntityName(id) {
	let obj = findEntity(id);
	return obj ? obj.name : null;
}

export function getText(cn: Context, text, useDictionary?: boolean): string {
	if (cn == null || !cn.locale) return (text || "").toString();
	if (!text) return "";

	if (typeof text == "string" && useDictionary)
		text = glob.dictionary[cn.pack + "." + text] || glob.dictionary["sys." + text] || text;

	if (typeof text == "string")
		return text;

	let localeName = Locale[cn.locale];
	if (text[localeName])
		return text[localeName];
	else
		return _.values(text)[0];
}

export function getEnumText(thePackage: string, dependencies: string[], enumType: string, value: number, locale?: Locale) {
	if (value == null)
		return "";

	let theEnum = getEnumByName(thePackage, dependencies, enumType);
	if (!theEnum)
		return value;

	let text = theEnum[value];
	return getMultilLangugeText(text, locale);
}

export function getEnumByName(thePackage: string, dependencies: string[], enumType: string) {
	let theEnum = glob.enumTexts[thePackage + "." + enumType];

	for (let i = 0; !theEnum && i < dependencies.length; i++) {
		theEnum = glob.enumTexts[dependencies[i] + "." + enumType];
	}

	return theEnum;
}

export function createEnumDataSource(thePackage: string, dependencies: string[], enumType: string, nullable: boolean, locale: Locale): any {
	let theEnum = getEnumByName(thePackage, dependencies, enumType);
	let result = {};
	if (nullable)
		result[0] = " ";

	for (let key in theEnum) {
		result[key] = getMultilLangugeText(theEnum[key], locale);
	}
	return result;
}

export function getEnumsTexts(thePackage: string, enumType: string, values: number[], locale?: Locale): string[] {
	if (values == null) return null;

	let theEnum = glob.enumTexts[thePackage + "." + enumType];
	if (!theEnum) return null;

	let texts: string[] = [];
	values.forEach(function (value) {
		let text = theEnum[value];
		texts.push(getMultilLangugeText(text, locale));
	});

	return texts;
}

export function isRightToLeftLanguage(loc: Locale) {
	return loc == Locale.ar || loc == Locale.fa;
}

export function getMultilLangugeText(text, loc: Locale) {
	if (!text)
		return "";

	if (typeof (text) == "object") {
		if (text.en && loc == Locale.en)
			return text.en;
		else if (text.fa && loc == Locale.fa)
			return text.fa;
		else
			return text.en || text.fa;
	}

	return text.toString();
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
	return _.flatten(fs.readdirSync(path).map(function (file) {
		let fileOrDir = fs.statSync([path, file].join('/'));
		if (fileOrDir.isFile())
			return (path + '/' + file).replace(/^\.\/\/?/, '');
		else if (fileOrDir.isDirectory())
			return getAllFiles([path, file].join('/'));
	}));
}

export function getPathSize(path) {
	let files = getAllFiles(path);
	let totalSize = 0
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
	for (let key in obj) {
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
	} else if (value && value.toString().indexOf("__ObjectID ") == 0) {
		return new ObjectId(value.split("__ObjectID ")[1]);
	} else
		return value;
}

export function jsonReplacer(key, value) {
	if (value instanceof RegExp) {
		return ("__REGEXP " + value.toString());
	} else if (value instanceof ObjectId) {
		return ("__ObjectID " + value.toString());
	} else
		return value;
}

export function aggergate(pack: string, objectName: string, query: any, callback) {
	let collection = glob.dbs[pack].collection(objectName);
	return collection.aggregate(query).toArray(callback);
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

export function getTypes(cn: Context, done: (err, result?: Pair[]) => void) {
	let objects = allObjects().map((ent: mObject) => {
		let title = getText(cn, ent.title) + (cn.pack == ent._package ? "" : " (" + ent._package + ")");
		return {ref: ent._id, title} as Pair
	});
	let functions = allFunctions().map((ent: Function) => {
		let title = getText(cn, ent.title) + (cn.pack == ent._package ? "" : " (" + ent._package + ")");
		return {ref: ent._id, title} as Pair
	});
	let enums = glob.enums.map((ent: Enum) => {
		let title = getText(cn, ent.title) + (cn.pack == ent._package ? "" : " (" + ent._package + ")");
		return {ref: ent._id, title} as Pair
	});

	let types = objects.concat(functions, enums);

	types = _.orderBy(types, ['title']);

	let ptypes: Pair[] = [];
	for (let type in PType) {
		ptypes.push({ref: new ObjectId(PType[type]), title: getText(cn, type, true)});
	}

	types.unshift({ref: "", title: "-"} as Pair);
	types = ptypes.concat(types);
	done(null, types);
}

export function getAllEntities(cn: Context, done: (err, result?: Pair[]) => void) {
	let entities = glob.entities.map((ent: Entity) => {
		let title = getText(cn, ent.title) + (cn.pack == ent._package ? "" : " (" + ent._package + ")");
		return {ref: ent._id, title} as Pair
	});
	entities = _.orderBy(entities, ['title']);
	done(null, entities);
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

				for (let attr in value) {
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

		for (let key in obj) {
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
		if (seen.has(obj)) return;
		seen.add(obj);

		for (let key in obj) {
			let val = obj[key];
			if (!val) continue;
			if (typeof val === "object") {
				if (val.$oid) {
					obj[key] = new ObjectId(val.$oid);
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

export function getPropertyReferenceValues(cn: Context, prop: Property, instance: any, done: (err, items: Pair[]) => void) {
	if (prop._enum) {
		let items = _.map(prop._enum.items, (item: EnumItem) => {
			return {ref: item.value, title: getText(cn, item.title)} as Pair;
		});
		return done(null, items);
	}

	let entity = findEntity(prop.type);
	if (!entity) {
		error(`Property '${prop.name}' type '${prop.type}' not found.`);
		return done(StatusCode.NotFound, null);
	}

	if (entity.entityType == EntityType.Object)
		return get(cn.pack, entity.name, {count: 10}, (err, result) => {
			if (result) {
				let items = _.map(result, (item) => {
					return {ref: item._id, title: getText(cn, item.title)} as Pair;
				});
				done(null, items);
			}
		});

	else if (entity.entityType == EntityType.Function) {
		let typeFunc = entity as Function;
		let args = [];
		if (typeFunc.parameters)
			for (let param of typeFunc.parameters) {
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

		return invoke(cn, typeFunc, args, done);
	}

	done(null, null);
}

export function envMode(): EnvMode {
	switch (process.env.NODE_ENV) {
		case "production":
			return EnvMode.Production;

		case "development":
		default:
			return EnvMode.Development;
	}
}

function mockCheckMatchInput(cn: Context, func: Function, args: any[], sample: FunctionTestSample): boolean {
	for (let key in sample.input) {
		if (!_.isEqual(sample.input[key], cn.req[key]))
			return false;
	}
	return true;
}

export function mock(cn: Context, func: Function, args: any[], done: (err, result?) => void) {
	log(`mocking function '${cn.pack}.${func.name}' ...`);

	if (!func.test.samples || !func.test.samples.length)
		return done({code: StatusCode.Ok, message: "No sample data!"});

	let withInputs = func.test.samples.filter((sample) => {
		return sample.input;
	});
	for (let sample of withInputs) {
		if (mockCheckMatchInput(cn, func, args, sample)) {
			let err = null;
			if (sample.code)
				err = {code: sample.code, message: sample.message};
			return done(err, sample.result);
		}
	}

	let withoutInput: FunctionTestSample = _.find(func.test.samples, (sample) => {
		return !sample.input;
	});

	if (withoutInput) {
		let err = null;
		if (withoutInput.code)
			err = {code: withoutInput.code, message: withoutInput.message};
		return done(err, withoutInput.result);
	}

	return done({code: StatusCode.Ok, message: "No default sample data!"});
}

export function invoke(cn: Context, func: Function, args: any[], done: (err, result?) => void) {
	try {
		if (func.test && func.test.mock && envMode() == EnvMode.Development && cn.url.pathname != "/functionTest") {
			mock(cn, func, args, done);
			return;
		}

		let action = require(`../${func._package}/main`)[func.name];
		if (!action) {
			if (func._package == Constants.sysPackage)
				action = require(`../web/main`)[func.name];
			if (!action) {
				let app = _.find(glob.apps, {_package: cn.pack});
				for (let pack of app.dependencies) {
					action = require(`../${pack}/main`)[func.name];
					if (action)
						break;
				}
			}
		}

		if (!action) return done(`Function'${func.name}'notfound.`);
		const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
		const ARGUMENT_NAMES = /([^\s,]+)/g;

		let fnStr = action.toString().replace(STRIP_COMMENTS, '');
		let argNames = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);
		if (argNames === null)
			argNames = [];

		if (args.length == 0)
			return action(cn, done);
		else
			return action(cn, ...args, done);
	} catch (ex) {
		if (ex.message == `${func.name} is not defined`) {
			todo(ex.message);
			done(StatusCode.NotImplemented);
		} else {
			exception(ex);
			done(ex.message);
		}
	}
}

export function runFunction(cn: Context, functionId: ObjectId, input: any, done) {
	let func = findEntity(functionId) as Function;
	if (!func) return done(StatusCode.NotFound);

	input = input || {};
	let args = [];
	if (func.parameters)
		for (let para of func.parameters) {
			args.push(input[para.name]);
		}
	invoke(cn, func, args, (err, result) => {
		done(err, result, func);
	});
}

