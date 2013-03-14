module.exports = function() {
    if (process.env.YENV == 'productin') return;
    console.log('=============');
    console.log(arguments);
    console.log('=============');
};