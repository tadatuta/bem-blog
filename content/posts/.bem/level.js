exports.getTechs = function() {
    return {
        'md': require.resolve('./techs/md.js'),
        'metajson.js': require.resolve('./techs/metajson.js.js')
    };
};