"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sys_1 = require("../../sys");
const path = require("path");
const types = require("../src/types");
const util = require('util');
let sys = require('../src/sys');
let reloadError;
sys_1.glob.rootDir = path.join(__dirname, "../..");
beforeAll(async () => {
});
test('country context', async () => {
    let country = await sys.countryLookup('85.100.69.90');
    expect(country).toBe('TR');
    country = await sys.countryLookup('81.31.235.67');
    expect(country).toBe('IR');
});
//# sourceMappingURL=main.test.js.map