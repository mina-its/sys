"use strict";
exports.__esModule = true;
var main_1 = require("./main");
var types_1 = require("./types");
var bson_1 = require("bson");
var types = require("./types");
var util = require('util');
var sys = require('./main');
var reloadError;
beforeAll(function (done) {
    sys.configureLogger(true);
    sys.configureLogger(true);
    sys.reload(null, function (err) {
        reloadError = err;
        done();
    });
});
describe('reload test', function () {
    test('load sys config', function () {
        expect(main_1.glob.dbs[types_1.Constants.sysPackage]).not.toBeNull();
        expect(main_1.glob.dbs[types_1.Constants.sysPackage].collection(types_1.SysCollection.systemConfig)).not.toBeNull();
    });
    test('initObject', function () {
        var obj = new types_1.mObject();
        sys.initObject(obj);
    });
    test('reload done without error', function () {
        expect(reloadError).toBeNull();
    });
    test('sys must be exist  ', function () {
        expect(sys.mem.packages["sys"]).not.toBeNull();
    });
});
describe('crud test', function () {
    var testObject;
    testObject = {
        "_id": new bson_1.ObjectId(),
        "name": "jila",
        "age": 36,
        "codes": [types_1.StatusCode.BadRequest, types_1.StatusCode.Gone],
        "address": { "detail": { "city": "tehran", "street": "mardani" }, location: { "x": 23.3232, "y": 563.33232, z: 12 } },
        birthday: new Date()
    };
    describe('put', function () {
        test('correct put done', function () {
            sys.put("sys", "unitTestObjects", testObject, {}, function (err, result) {
                expect(err).toBe(null);
                sys.get('sys', "unitTestObjects", { "_id": testObject._id }, function (getError, getResult) {
                    expect(getError).toBe(null);
                    expect(getResult).toBe(testObject);
                });
            });
        });
    });
    describe('get', function () {
        beforeEach(function (done) {
            sys.get('sys', 'unitTestObjects', { count: 1 }, function (err, result) {
                testObject = result;
                done();
            });
        });
        test('name should be a string', function () {
            expect(typeof testObject.name == "string").toBeTruthy;
        });
        test('name should be a jila', function () {
            expect(testObject.name == "jila").toBeTruthy;
        });
    });
    sys.get('sys', 'unitTestObjects', {}, function (err, result) {
        console.log(result);
    });
});
//# sourceMappingURL=main.test.js.map