const assert = require('assert');

// Simple test
assert.strictEqual(1 + 1, 2);
console.log('✅ Basic math works');

// Test string operations
const str = 'Browser AI Bridge';
assert.strictEqual(str.length, 18);
console.log('✅ String operations work');

console.log('\nAll tests passed!');
