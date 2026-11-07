const net = require('node:net');
const original = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
    const first = Array.isArray(args[0]) ? args[0][0] : args[0];
    const host = first && typeof first === 'object' ? first.host ?? first.hostname : args[1];
    if (!['127.0.0.1', '::1'].includes(host)) {
        throw Object.assign(new Error('Test blocked an external connection'), { code: 'TEST_NETWORK_BLOCKED' });
    }
    return Reflect.apply(original, this, args);
};
