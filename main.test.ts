import sys = require('./main');

beforeAll(done => {
  sys.configureLogger(true);
  sys.reload(null, done);
});

test('sys must be exist  ', () => {
  expect(sys.mem.packages["sys"]).not.toBeNull();
});

test('sys must be exist  ', () => {
  expect(sys.mem.packages["sys"]).not.toBeNull();
});


// describe('reload test', done => {
//
//   function callback(error) {
//     try {
//       test('', done => {
//         expect(error).toBeNull();
//       });
//
//       test('', done => {
//         expect(sys.mem.packages["sys"]).not.toBeNull();
//       });
//       test('', done => {
//         expect(2 + 2).toBe(4);
//       });
//
//
//     }
//     catch (error) {
//
//     }
//   }
//
// })


