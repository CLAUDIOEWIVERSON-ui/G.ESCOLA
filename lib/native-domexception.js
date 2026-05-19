// This is a dummy replacement for node-domexception to suppress the deprecation warning.
// Since Node.js 18+ has a native DOMException, we can just export that.
module.exports = global.DOMException;
