///<reference path="../node_modules/@types/jest/index.d.ts"/>
import {execShellCommand, glob, newID} from "../../sys";
import {Constants, mObject, StatusCode, UnitTestObject} from "../src/types";
import path=require("path");


const types = require("../src/types");
const util = require('util');


let sys = require('../src/sys');
let reloadError;
glob.rootDir = path.join(__dirname, "../..");

beforeAll(async () => {
	//sys.configureLogger(false);
//	await sys.reload();
});

test('country context',async()=>{
	let country= await sys.countryLookup('85.100.69.90');
	expect(country).toBe('TR');
	country= await sys.countryLookup('81.31.235.67');
	expect(country).toBe('IR');

});



// describe('reload test', () => {
// 	test('initObject', () => {
// 		let obj = new mObject();
// 		//obj.properties=[];
// 		sys.initObject(obj);
// 		//expect(typeof (obj.properties)).toBe('Array');
// 		//expect(obj._access[obj._.pack] = obj.access).toBeTruthy();
//
// 	});
//
// 	test('reload done without error', () => {
// 		expect(reloadError).toBeNull();
// 	});
// 	test('sys must be exist  ', () => {
// 		expect(sys.mem.packages["sys"]).not.toBeNull();
// 	});
// });
//
// describe('crud test', function () {
// 	let testObject: UnitTestObject;
// 	testObject = {
// 		"_id": newID(),
// 		"name": "jila",
// 		"age": 36,
// 		"codes": [StatusCode.BadRequest, StatusCode.Gone],
// 		"address": {"detail": {"city": "tehran", "street": "mardani"}, location: {"x": 23.3232, "y": 563.33232, z: 12}},
// 		birthday: new Date()
// 	}
// 	describe('put', () => {
// 		test('correct put done', () => {
// 			sys.put("sys", "unitTestObjects", testObject, {}, (err, result) => {
// 				expect(err).toBe(null);
// 				sys.get('sys', "unitTestObjects", {"_id": testObject._id}, (getError, getResult) => {
// 					expect(getError).toBe(null);
// 					expect(getResult).toBe(testObject);
// 				});
// 			});
// 		});
// 	});
// 	describe('get', () => {
//
// 		beforeEach(done => {
// 			sys.get('sys', 'unitTestObjects', {count: 1}, function (err, result) {
// 				testObject = result;
// 				done();
// 			});
// 		});
//
// 		test('name should be a string', () => {
// 			expect(typeof testObject.name == "string").toBeTruthy;
// 		});
//
// 		test('name should be a jila', () => {
// 			expect(testObject.name == "jila").toBeTruthy;
// 		});
//
// 		// test('code should be an array', () => {
// 		//   expect(typeof testObject.picture == types.FileInfo).toBeTruthy;
// 		// });
// 		//
// 		// test('name should be a string', () => {
// 		//   expect(typeof testObject.name == "string").toBeTruthy;
// 		// });
// 		//
// 		// test('name should be a string', () => {
// 		//   expect(typeof testObject.name == "string").toBeTruthy;
// 		// });
//
// 	});
//
// 	// let collection = sys.mem.dbs['sys'].collection('unitTestObjects');
// 	sys.get('sys', 'unitTestObjects', {}, (err, result) => {
// 		console.log(result);
// 	});
//
// });
