"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const main_1 = require("./main");
const types_1 = require("./types");
const bson_1 = require("bson");
const types = require("./types");
const util = require('util');
let sys = require('./main');
let reloadError;
beforeAll(async () => {
    sys.configureLogger(true);
    await sys.reload();
});
describe('reload test', () => {
    test('load sys config', () => {
        expect(main_1.glob.dbs[types_1.Constants.sysPackage]).not.toBeNull();
        expect(main_1.glob.dbs[types_1.Constants.sysPackage].collection(types_1.SysCollection.systemConfig)).not.toBeNull();
    });
    test('initObject', () => {
        let obj = new types_1.mObject();
        sys.initObject(obj);
    });
    test('reload done without error', () => {
        expect(reloadError).toBeNull();
    });
    test('sys must be exist  ', () => {
        expect(sys.mem.packages["sys"]).not.toBeNull();
    });
});
describe('crud test', function () {
    let testObject;
    testObject = {
        "_id": new bson_1.ObjectId(),
        "name": "jila",
        "age": 36,
        "codes": [types_1.StatusCode.BadRequest, types_1.StatusCode.Gone],
        "address": { "detail": { "city": "tehran", "street": "mardani" }, location: { "x": 23.3232, "y": 563.33232, z: 12 } },
        birthday: new Date()
    };
    describe('put', () => {
        test('correct put done', () => {
            sys.put("sys", "unitTestObjects", testObject, {}, (err, result) => {
                expect(err).toBe(null);
                sys.get('sys', "unitTestObjects", { "_id": testObject._id }, (getError, getResult) => {
                    expect(getError).toBe(null);
                    expect(getResult).toBe(testObject);
                });
            });
        });
    });
    describe('get', () => {
        beforeEach(done => {
            sys.get('sys', 'unitTestObjects', { count: 1 }, function (err, result) {
                testObject = result;
                done();
            });
        });
        test('name should be a string', () => {
            expect(typeof testObject.name == "string").toBeTruthy;
        });
        test('name should be a jila', () => {
            expect(testObject.name == "jila").toBeTruthy;
        });
    });
    sys.get('sys', 'unitTestObjects', {}, (err, result) => {
        console.log(result);
    });
});
//# sourceMappingURL=main.test.js.map