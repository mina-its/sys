import logger = require('winston');
import mongodb = require('mongodb');
import _ = require('lodash');
import xmlBuilder = require('xmlbuilder');
import fs = require('fs-extra');
import path = require('path');
import moment = require('moment');
import graphlib = require('graphlib');
import Jalali = require('jalali-moment');
import sourceMapSupport = require('source-map-support');
import AWS = require('aws-sdk');
import rimraf = require("rimraf");
import {MongoClient, ObjectId} from 'mongodb';
import {fromCallback} from 'universalify';
import {
	App,
	AuditArgs,
	AuditType,
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
	EnumItem,
	EnvMode,
	ErrorObject,
	File,
	Form,
	Function,
	FunctionTestSample,
	GetOptions,
	Global,
	GlobalType, IProperties,
	Locale,
	LogType,
	Menu,
	mObject,
	ObjectModifyState,
	ObjectModifyType,
	PackageConfig,
	Pair,
	Property,
	PropertyReferType,
	PropertyViewMode,
	PType,
	PutOptions,
	Reference,
	RefPortion,
	RefPortionType,
	RequestMode,
	Role,
	SourceType,
	StatusCode,
	SysAuditTypes,
	SysCollection,
	SystemConfigPackage,
	SystemProperty,
	Text,
	UploadedFile,
} from './types';

const assert = require('assert').strict;
const {EJSON} = require('bson');
const {exec} = require("child_process");
export let glob = new Global();
const fsPromises = fs.promises;

export async function reload(cn?: Context) {
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

export async function start() {
	try {
		process.on('uncaughtException', async err =>
			await audit(SysAuditTypes.uncaughtException, {level: LogType.Fatal, comment: err.message + ". " + err.stack})
		);

		process.on('unhandledRejection', async (err: any) => {
			await audit(SysAuditTypes.unhandledRejection, {
				level: LogType.Fatal,
				comment: err.message + ". " + err.stack
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

function isWindows() {
	return /^win/.test(process.platform);
}

export async function audit(auditType: string, args: AuditArgs) {
	args.type = args.type || new ObjectId(auditType);
	args.time = new Date();
	let comment = args.comment || "";
	let type = _.find(glob.auditTypes, (type: AuditType) => {
		return type._id.equals(args.type)
	});
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
	await put(args.pack || Constants.sysPackage, SysCollection.audits, args);
}

export function run(cn, func: string, ...args) {
	try {
		let theFunction = eval(_.camelCase(func));
		theFunction(cn, ...args);
	} catch (err) {
		warn(`[exe] ${func}`);
	}
}

export async function get(pack: string | Context, objectName: string, options?: GetOptions) {
	let collection = await getCollection(pack, objectName);
	options = options || {} as GetOptions;

	let result;
	if (options.itemId)
		result = collection.findOne(options.itemId);
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

export async function makeObjectReady(pack: string | Context, properties: Property[], data: any) {
	if (!data) return;

	data = Array.isArray(data) ? data : [data];
	for (let item of data) {
		for (let prop of properties) {
			let val = item[prop.name];
			if (!val) continue;
			if (prop._ && prop._.isRef && !prop._.enum && prop.viewMode != PropertyViewMode.Hidden && isObjectId(val)) {
				let refObj = findEntity(prop.type);
				if (!refObj)
					throwError(StatusCode.UnprocessableEntity, `referred object for property '${pack}.${prop.name}' not found!`);

				if (refObj.entityType == EntityType.Object)
					item[prop.name] = await get(pack, refObj.name, {itemId: val, rawData: true});
				else if (refObj.entityType == EntityType.Function) {
					// todo: makeObjectReady for functions
				}
			}
			if (prop.properties)
				await makeObjectReady(pack, prop.properties, val);
		}
	}
}

export async function getOne(pack: string | Context, objectName: string, rawData: boolean = false) {
	return get(pack, objectName, {count: 1, rawData});
}

async function getCollection(pack: string | Context, objectName: string) {
	let db = await connect(pack);
	return db.collection(objectName);
}

export async function put(pack: string | Context, objectName: string, item: any, options?: PutOptions) {
	let collection = await getCollection(pack, objectName);
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
			item._id = item._id || new ObjectId();
			let rootId = portions[1].itemId;
			let pth: string = await portionsToMongoPath(pack, rootId, portions, portions.length);
			command.$addToSet[pth] = item;
			await collection.updateOne({_id: rootId}, command);
			return {
				type: ObjectModifyType.Patch,
				item: item,
				itemId: rootId
			};
	}
}

export async function portionsToMongoPath(pack: string | Context, rootId: ObjectId, portions: RefPortion[], endIndex: number) {
	if (endIndex == 3) // not need to fetch data
		return portions[2].property.name;

	let db = await connect(pack);
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
			let partItem = _.find(value, (it) => {
				return it._id && it._id.toString() == part;
			});
			if (!partItem) throw StatusCode.ServerError;
			path += "." + value.indexOf(partItem);
			value = partItem;
		}
	}
	return _.trim(path, '.');
}

export async function count(pack: string | Context, objectName: string, options: GetOptions) {
	let collection = await getCollection(pack, objectName);
	options = options || {} as GetOptions;
	return await collection.countDocuments(options);
}

export function extractRefPortions(cn: Context, ref: string, _default?: string): RefPortion[] {
	try {
		ref = _.trim(ref, '/') || _default;
		if (!ref)
			return null;

		let portions: RefPortion[] = _.map(ref.split('/'), (portion) => {
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

		let entity: Entity = _.find(glob.entities, (entity) => {
			return entity._id.toString() === portions[0].value
		});

		if (!entity)
			entity = glob.entities.find(en => en._.pack == cn.pack && en.name == portions[0].value);

		if (!entity)
			entity = glob.entities.find(en => en.name === portions[0].value && cn["app"].dependencies.indexOf(en._.pack) > -1);

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
			} else if (parent._.gtype == GlobalType.file) {
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
		error("extractRefPortions", ex);
	}
}

export async function patch(pack: string | Context, objectName: string, patchData: any, options?: PutOptions) {
	let db = await connect(pack);
	let collection = db.collection(objectName);
	if (!collection) throw StatusCode.BadRequest;
	if (!options) options = {portions: []};
	let portions = options.portions;
	if (!portions)
		portions = [{type: RefPortionType.entity, value: objectName} as RefPortion];

	if (portions.length == 1)
		throw StatusCode.BadRequest;

	let theRootId = portions.length < 2 ? patchData._id : portions[1].itemId;
	let path = await portionsToMongoPath(pack, theRootId, portions, portions.length);
	let command = {$set: {}, $unset: {}};
	if (portions[portions.length - 1].property && portions[portions.length - 1].property._.gtype == GlobalType.file)
		command["$set"][path] = patchData; // e.g. multiple values for files in 'tests' object
	else
		for (let key in patchData) {
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

export async function del(pack: string | Context, objectName: string, options?: DelOptions) {
	let db = await connect(pack);
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

			let path = await portionsToMongoPath(pack, rootId, portions, portions.length - 1);
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

	return /^\./.test(paths[0]) ? path.join(glob.rootDir, ...paths) : path.join(...paths);
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
			let db = await connect(drive._.pack);
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

export async function fileExists(drive: Drive, filePath: string): Promise<boolean> {
	switch (drive.type) {
		case SourceType.File:
			let _path = path.join(getAbsolutePath(drive.address), filePath);
			return await fs.access(_path);

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
			let db = await connect(drive._.pack);
			;
			let bucket = new mongodb.GridFSBucket(db);
			let stream = bucket.openUploadStream(relativePath);
			await delFile(drive._.pack, drive, relativePath);
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
			let addr = path.join(getAbsolutePath(drive.address), dir);
			let list = await fsPromises.readdir(addr, {withFileTypes: true});
			let files: DirFile[] = list.map(item => {
				return {name: item.name, type: item.isDirectory() ? DirFileType.Folder : DirFileType.File} as DirFile
			});
			for (let file of files) {
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
					if (err)
						reject(err);
					else {
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
	for (let part of parts) {
		uri += "/" + (part || "").replace(/^\//, '').replace(/\/$/, '');
	}
	return uri.substr(1);
}

function getS3DriveSdk(drive: Drive) {
	if (drive.s3._sdk) return drive.s3._sdk;

	const sdk = require('aws-sdk');
	if (!drive.s3.accessKeyId)
		throwError(StatusCode.ConfigurationProblem, `s3 accessKeyId for drive package '${drive._.pack}' must be configured.`);
	else
		sdk.config.accessKeyId = drive.s3.accessKeyId;

	if (!drive.s3.secretAccessKey)
		throwError(StatusCode.ConfigurationProblem, `s3 secretAccessKey for drive package '${drive._.pack}' must be configured.`);
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

async function loadGeneralCollections() {
	log('loadGeneralCollections ...');

	glob.timeZones = await get(Constants.sysPackage, Constants.timeZonesCollection);
	let result: mObject = await get(Constants.sysPackage, SysCollection.objects, {
		query: {name: Constants.systemPropertiesObjectName},
		count: 1, rawData: true
	});
	if (!result) {
		logger.error("loadGeneralCollections failed terminating process ...");
		process.exit();
	}
	glob.systemProperties = result ? result.properties : [];
}

async function loadAuditTypes() {
	log('loadAuditTypes ...');
	glob.auditTypes = await get(Constants.sysPackage, SysCollection.auditTypes, {rawData: true});
}

function getEnabledPackages(): SystemConfigPackage[] {
	return glob.sysConfig.packages.filter(pack => pack.enabled);
}

async function loadSysConfig() {
	let collection = await getCollection(Constants.sysPackage, SysCollection.systemConfig);
	glob.sysConfig = await collection.findOne({});
	for (let pack of getEnabledPackages()) {
		try {
			glob.packages[pack.name] = require(getAbsolutePath('./' + pack.name, `src/main`));
			if (glob.packages[pack.name] == null)
				error(`Error loading package ${pack.name}!`);
		} catch (ex) {
			error("loadSysConfig", ex);
			pack.enabled = false;
		}
	}

	glob.packageConfigs["web"] = {_: require(getAbsolutePath("./web", `package.json`))} as any;
	applyAmazonConfig();
}

function applyAmazonConfig() {
	if (glob.sysConfig.amazon) {
		if (!glob.sysConfig.amazon.accessKeyId)
			warn('s3 accessKeyId, secretAccessKey is required in sysConfig!');
		else
			AWS.config.accessKeyId = glob.sysConfig.amazon.accessKeyId;

		if (!glob.sysConfig.amazon.secretAccessKey)
			warn('s3 secretAccessKe, secretAccessKey is required in sysConfig!');
		else
			AWS.config.secretAccessKey = glob.sysConfig.amazon.secretAccessKey;
	}
}

async function loadPackageSystemCollections(packConfig: SystemConfigPackage) {
	let pack = packConfig.name;

	log(`Loading system collections package '${pack}' ...`);

	let objects: mObject[] = await get(pack, SysCollection.objects, {rawData: true});
	for (let object of objects) {
		object._ = {pack};
		object.entityType = EntityType.Object;
		glob.entities.push(object as Entity);
	}

	let functions: Function[] = await get(pack, SysCollection.functions, {rawData: true});
	for (let func of functions) {
		func._ = {pack};
		func.entityType = EntityType.Function;
		glob.entities.push(func as Entity);
	}

	let config: PackageConfig = await getOne(pack, SysCollection.packageConfig, true);
	if (!config) {
		packConfig.enabled = false;
		error(`Config for package '${pack}' not found!`);
	} else {
		glob.packageConfigs[pack] = config;
		glob.packageConfigs[pack]._ = require(getAbsolutePath('./' + pack, `package.json`));
		log(`package '${pack}' loaded. version: ${glob.packageConfigs[pack]._.version}`);
	}

	let forms: Form[] = await get(pack, SysCollection.forms, {rawData: true});
	for (let form of forms) {
		form._ = {pack};
		form.entityType = EntityType.Form;
		glob.entities.push(form as Entity);
	}

	let texts: Text[] = await get(pack, SysCollection.dictionary, {rawData: true});
	for (let item of texts) {
		glob.dictionary[pack + "." + item.name] = item.text;
	}

	let menus: Menu[] = await get(pack, SysCollection.menus, {rawData: true});
	for (let menu of menus) {
		menu._ = {pack};
		glob.menus.push(menu);
	}

	let roles: Role[] = await get(pack, SysCollection.roles, {rawData: true});
	for (let role of roles) {
		role._ = {pack};
		glob.roles.push(role);
	}

	let drives: Drive[] = await get(pack, SysCollection.drives, {rawData: true});
	for (let drive of drives) {
		drive._ = {pack};
		glob.drives.push(drive);
	}
}

async function loadSystemCollections() {
	glob.entities = [];
	glob.dictionary = {};
	glob.menus = [];
	glob.roles = [];
	glob.drives = [];

	for (let packConfig of getEnabledPackages()) {
		try {
			await loadPackageSystemCollections(packConfig);
		} catch (err) {
			error("loadSystemCollections", err);
			packConfig.enabled = false;
		}
	}
}

export function configureLogger(silent: boolean) {
	let logDir = getAbsolutePath('./logs');
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
	return true;
}

export function initializeRoles() {
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
}

export function checkAppMenu(app: App) {
	if (!app.menu)
		app.menu = glob.menus.find(menu => menu._.pack == app._.pack);

	if (!app.menu)
		warn(`Menu for app '${app.title}' not found!`);
}

function initializePackages() {
	log(`initializePackages: ${glob.sysConfig.packages.map(p => p.name).join(' , ')}`);
	glob.apps = [];
	for (let pack of getEnabledPackages()) {
		let config = glob.packageConfigs[pack.name];
		for (let app of (config.apps || [])) {
			app._ = {pack: pack.name};
			app.dependencies = app.dependencies || [];
			app.dependencies.push(Constants.sysPackage);
			checkAppMenu(app);
			if (validateApp(pack.name, app)) {
				glob.apps.push(app);
				let host = glob.sysConfig.hosts.find(host => host.app && host.app.equals(app._id));
				if (host) host._ = {app};
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
			warn(`property '${entity._.pack}.${entity.name}.${prop.name}' type is empty!`);
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

		case PType.reference:
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

export async function connect(pack: string | Context, connectionString?: string): Promise<mongodb.Db> {
	if (typeof pack != "string")
		pack = pack.pack;
	if (glob.dbs[pack + ":" + connectionString]) return glob.dbs[pack + ":" + connectionString];
	connectionString = connectionString || process.env.DB_ADDRESS;
	if (!connectionString)
		throw("Environment variable 'DB_ADDRESS' is needed.");

	try {
		let dbc = await MongoClient.connect(connectionString, {useNewUrlParser: true, useUnifiedTopology: true});
		if (!dbc)
			return null;
		return glob.dbs[pack + ":" + connectionString] = dbc.db(pack);
	} catch (e) {
		throw `db '${pack}' connection failed [${connectionString}]`;
	}
}

export function findEnum(type: ObjectId): Enum {
	if (!type) return null;
	return glob.enums.find(enm => enm._id.equals(type));
}

export function findEntity(id: ObjectId): Entity {
	if (!id) return null;
	return glob.entities.find(a => a._id.equals(id));
}

export function findObject(pack: string | Context, objectName: string): mObject {
	if (typeof pack != "string")
		pack = pack.pack;
	return glob.entities.find(a => a._.pack == pack && a.name == objectName && a.entityType == EntityType.Object) as mObject;
}

export async function initializeEnums() {
	log('initializeEnums ...');
	glob.enums = [];
	glob.enumTexts = {};

	for (let pack of getEnabledPackages()) {
		let enums: Enum[] = await get(pack.name, SysCollection.enums, {rawData: true});
		for (let theEnum of enums) {
			theEnum._ = {pack: pack.name};
			glob.enums.push(theEnum);

			let texts = {};
			_.sortBy(theEnum.items, Constants.indexProperty).forEach((item) => {
				texts[item.value] = item.title || item.name;
			});
			glob.enumTexts[pack.name + "." + theEnum.name] = texts;
		}
	}
}

export function allObjects(cn: Context): mObject[] {
	let ss = glob.entities.filter(en => !en._);
	return glob.entities.filter(en => en.entityType == EntityType.Object && (!cn || containsPack(cn, en._.pack))) as mObject[];
}

export function allFunctions(cn: Context): Function[] {
	return glob.entities.filter(en => en.entityType == EntityType.Function && (!cn || containsPack(cn, en._.pack))) as Function[];
}

async function initializeEntities() {
	log(`Initializing '${allObjects(null).length}' Objects ...`);
	let allObjs = allObjects(null);
	for (let obj of allObjs) {
		obj._.inited = false;
	}

	for (let obj of allObjs) {
		initObject(obj);
	}

	for (let pack of getEnabledPackages()) {
		let config = glob.packageConfigs[pack.name];
		let obj = findObject(pack.name, SysCollection.packageConfig);
		await makeObjectReady(pack.name, obj.properties, config);
		for (let app of config.apps) {
			app._.loginForm = Constants.defaultLoginUri;
			if (app.loginForm) {
				let entity = findEntity(app.loginForm);
				if (entity) app._.loginForm = entity.name;
			}
		}
	}

	log(`Initializing '${allFunctions(null).length}' functions ...`);
	for (let func of allFunctions(null)) {
		try {
			func._.access = {};
			func._.access[func._.pack] = func.access;
			initProperties(func.properties, func, func.title);
		} catch (ex) {
			error("Init functions, Module: " + func._.pack + ", Action: " + func.name, ex);
		}
	}
}

function checkFileProperty(prop: Property, entity: Entity) {
	if (prop._.gtype == GlobalType.file) {
		if (prop.file && prop.file.drive) {
			prop.file.drive = glob.drives.find(d => d._id.equals(prop.file.drive as any));
			if (!prop.file.drive)
				error(`drive for property file '${entity._.pack}.${entity.name}.${prop.name}' not found.`);
		} else if (entity.entityType == EntityType.Object)
			error(`drive for property file '${entity._.pack}.${entity.name}.${prop.name}' must be set.`);
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
	for (let prop of properties) {
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
		obj._.access[obj._.pack] = obj.access;
		initProperties(obj.properties, obj);

		if (obj.reference) {
			let referenceObj = findEntity(obj.reference) as mObject;
			if (!referenceObj)
				return warn(`SimilarObject in service '${obj._.pack}' not found for object: '${obj.title}', SimilarObjectID:${obj.reference}`);

			initObject(referenceObj);

			_.defaultsDeep(obj, referenceObj);
			compareParentProperties(obj.properties, referenceObj.properties, obj);
		} else if (obj.properties) {
			for (let prop of obj.properties) {
				checkPropertyReference(prop, obj);
			}
		}
	} catch (ex) {
		error(`initObject, Error in object ${obj._.pack}.${obj.name}`, ex);
	}
}

function checkPropertyReference(property: Property, entity: Entity) {
	if (property._.gtype == GlobalType.object && (!property.properties || !property.properties.length)) {
		let propertyParentObject = findEntity(property.type) as mObject;
		if (!propertyParentObject) {
			if (property._.gtype == GlobalType.object) return;
			return error(`Property '${entity._.pack}.${entity.name}.${property.name}' type '${property.type}' not found.`);
		}

		initObject(propertyParentObject);

		property.properties = property.properties || [];
		if (!property._.parentPropertiesCompared) {
			property._.parentPropertiesCompared = true;
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

	let parentNames = parentProperties.map(p => p.name);
	properties.filter(p => parentNames.indexOf(p.name) == -1).forEach(newProperty => checkPropertyReference(newProperty, entity));

	for (let parentProperty of parentProperties) {
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

export function getPackageConfig(pack: string): PackageConfig {
	let config = glob.packageConfigs[pack];
	if (!config)
		throw `config for package '${pack}' not found.`;

	// reload package.json
	config._ = require(getAbsolutePath('./' + pack, `package.json`)) as any;
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
	let objects: any[] = allObjects(cn).map((ent: mObject) => {
		let title = getText(cn, ent.title) + (cn.pack == ent._.pack ? "" : " (" + ent._.pack + ")");
		return {...ent, title}
	});
	let functions: any[] = allFunctions(cn).map((ent: Function) => {
		let title = getText(cn, ent.title) + (cn.pack == ent._.pack ? "" : " (" + ent._.pack + ")");
		return {...ent, title}
	});
	let enums: any[] = glob.enums.filter(en => containsPack(cn, en._.pack)).map((ent: Enum) => {
		let title = getText(cn, ent.title) + (cn.pack == ent._.pack ? "" : " (" + ent._.pack + ")");
		return {...ent, title}
	});

	let types = objects.concat(functions, enums);
	types = _.orderBy(types, ['title']);

	let ptypes: any[] = [];
	for (let type in PType) {
		ptypes.push({_id: new ObjectId(PType[type]), title: getText(cn, type, true)});
	}

	types.unshift({_id: null, title: "-"});
	types = ptypes.concat(types);
	return types;
}

export function containsPack(cn: Context, pack: string): boolean {
	return pack == cn.pack || cn["app"].dependencies.indexOf(pack) > -1;
}

export async function getAllEntities(cn: Context) {
	let entities = glob.entities.filter(en => containsPack(cn, en._.pack));
	entities = entities.map(ent => {
		let title = getText(cn, ent.title) + (cn.pack == ent._.pack ? "" : " (" + ent._.pack + ")");
		return {...ent, title}
	});
	entities = _.orderBy(entities, ['title']);
	return entities;
}

export async function getDataEntities(cn: Context) {
	let entities = glob.entities.filter(e => e.entityType == EntityType.Function || e.entityType == EntityType.Object).map(ent => {
		let title = getText(cn, ent.title) + (cn.pack == ent._.pack ? "" : " (" + ent._.pack + ")");
		return {...ent, title}
	});
	entities = _.orderBy(entities, ['title']);
	return entities;
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

export async function getPropertyReferenceValues(cn: Context, prop: Property, instance: any) {
	if (prop._.enum) {
		let items = _.map(prop._.enum.items, (item: EnumItem) => {
			return {ref: item.value, title: getText(cn, item.title)} as Pair;
		});
		return items;
	}

	let entity = findEntity(prop.type);
	if (!entity) {
		error(`Property '${prop.name}' type '${prop.type}' not found.`);
		throw StatusCode.NotFound;
	}

	if (entity.entityType == EntityType.Object) {
		let result = await get(cn.pack, entity.name, {count: 10, rawData: true});
		if (result) {
			return _.map(result, (item) => {
				return {ref: item._id, title: getText(cn, item.title)} as Pair;
			});
		} else
			return null;
	} else if (entity.entityType === EntityType.Function) {
		let typeFunc = entity as Function;
		let args = [];
		if (typeFunc.properties)
			for (let param of typeFunc.properties) {
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

export async function mock(cn: Context, func: Function, args: any[]) {
	log(`mocking function '${cn.pack}.${func.name}' ...`);

	if (!func.test.samples || !func.test.samples.length)
		return {code: StatusCode.Ok, message: "No sample data!"};

	let withInputs = func.test.samples.filter((sample) => {
		return sample.input;
	});
	for (let sample of withInputs) {
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
	argNames.forEach((argName, i) => {
		argData[argName] = args[i];
	});

	let fileParams = func.properties.filter(p => p._.gtype == GlobalType.file);
	if (fileParams.length) {
		let uploadedFiles = await getUploadedFiles(cn, true);

		for (let param of fileParams) {
			if (param.isList)
				throwError(StatusCode.NotImplemented, `no support for multiple files params!`);

			let val: File = argData[param.name];
			if (val) {
				let file = uploadedFiles.find(f => f.name == val.name);
				if (!file)
					throwError(StatusCode.BadRequest, `parameter '${param.name}' is mandatory!`);
				val._ = val._ || {};
				val._.rawData = file.rawData;
			}
		}
	}

	for (let prop of func.properties) {
		let val = argData[prop.name];
		if (val == null && prop.required)
			throwError(StatusCode.BadRequest, `parameter '${prop.name}' is mandatory!`);

		if (prop._.isRef && !prop._.enum && prop.viewMode != PropertyViewMode.Hidden && isObjectId(val)) {
			let refObj = findEntity(prop.type);
			if (!refObj)
				throwError(StatusCode.UnprocessableEntity, `referred object for property '${cn.pack}.${prop.name}' not found!`);

			if (refObj.entityType == EntityType.Object)
				argData[prop.name] = await get(cn.pack, refObj.name, {itemId: val, rawData: true});
			else if (refObj.entityType == EntityType.Function) {
				// todo: makeObjectReady for functions
			}
		}
	}

	return Object.values(argData);
}

export async function invoke(cn: Context, func: Function, args: any[]) {
	if (func.test && func.test.mock && envMode() == EnvMode.Development && cn.url.pathname != "/functionTest") {
		return await mock(cn, func, args);
	}

	let action = require(getAbsolutePath('./' + func._.pack, `src/main`))[func.name];
	if (!action) {
		if (func._.pack == Constants.sysPackage)
			action = require(getAbsolutePath(`./web/src/main`))[func.name];
		if (!action) {
			let app = glob.apps.find(app => app._.pack == cn.pack);
			for (let pack of app.dependencies) {
				action = require(getAbsolutePath('./' + pack, `src/main`))[func.name];
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
	for (let file of cn["httpReq"].files) {
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

export async function runFunction(cn: Context, functionId: ObjectId, input: any) {
	let func = findEntity(functionId) as Function;
	if (!func) throw StatusCode.NotFound;

	input = input || {};
	let args = [];
	if (func.properties)
		for (let para of func.properties) {
			args.push(input[para.name]);
		}

	return invoke(cn, func, args);
	//done(err, result, func);
}

export function isObjectId(value: any): boolean {
	if (!value) return false;
	return value._bsontype == "ObjectID";
}

export function throwError(code: StatusCode, message?: string) {
	throw new ErrorObject(code, message);
}

export function getReference(id?: string): Reference {
	return new ObjectId(id);
}

export function clientLog(cn: Context, message: string, type: LogType = LogType.Debug, ref?: string) {
	logger.log(LogType[type].toLowerCase(), message);
	postClientCommandCallback(cn, ClientCommand.Log, message, type, ref);
}

export function clientCommand(cn: Context, command: ClientCommand, ...args) {
	postClientCommandCallback(cn, command, ...args);
}

export async function removeDir(dir: string) {
	return new Promise((resolve, reject) => {
		rimraf(dir, {silent: true}, (ex) => {
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
		let waitFn = (answer: number) => resolve(answer);
		let questionID = new ObjectId().toString();
		glob.clientQuestionCallbacks[cn["httpReq"].session.id + ":" + questionID] = waitFn;
		postClientCommandCallback(cn, ClientCommand.Question, questionID, message, items);
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
	postClientCommandCallback(cn, ClientCommand.Notification, title, message, url, icon);
}

export let postClientCommandCallback;

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

