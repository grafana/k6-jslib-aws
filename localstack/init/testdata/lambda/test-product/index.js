/* eslint-env node */
exports.handler = async (event) => {
    console.log('received event:', JSON.stringify(event));
    return event.a * event.b
};