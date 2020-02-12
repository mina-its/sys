"use strict";
exports.__esModule = true;
var sys = require("./main");
beforeAll(function (done) {
    sys.configureLogger(true);
    sys.reload(null, done);
});
test('sys must be exist  ', function () {
    expect(sys.glob.packages["sys"]).not.toBeNull();
});
test('sys must be exist  ', function () {
    expect(sys.glob.packages["sys"]).not.toBeNull();
});
//# sourceMappingURL=main.test.js.map