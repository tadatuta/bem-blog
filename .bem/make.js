/*global MAKE:true */

var log = require('./log.js'),
    BEM = require('bem'),
    PATH = require('path'),
    FS = require('fs'),
    VM = require('vm');

require('./nodes');

MAKE.decl('Arch', {

    blocksLevelsRegexp: /^.+?\.blocks$/,

    bundlesLevelsRegexp: /^.+?\.bundles$/,

    libraries : [ 'bem-bl' ],

    // declare custome node that generates desktop.bundles/*/*.bemjson.js using tempates/*/*/*.bemjson.js and content/*/*.md files
    createCustomNodes: function(common, libs, blocks, bundles) {

        var node = new (MAKE.getNodeClass('PagesGeneratorNode'))({
                id: 'pages-generator',
                root: this.root,
                sources: ['pages', 'posts'] // TODO: get from config
            });

        this.arch.setNode(node, bundles, libs);

        return node.getId();

    }

});

MAKE.decl('PagesGeneratorNode', 'Node',
{

    __constructor: function(o) {
        this.root = o.root;
        this.sources = o.sources;
        this.__base(o);
    },

    make: function() {
        if (this.done) return; // skip rebuild if it was already done in the same process

        var bundlesLevel = BEM.createLevel(PATH.resolve(this.root, 'templates', 'simple.bundles')), // TODO: get from config
            _this = this,
            ctx = this.ctx,
            promises;

        promises = this.sources.reduce(function(res, source) {

            var level = BEM.createLevel(PATH.resolve(_this.root, 'content', source));

            return res.concat(level.getItemsByIntrospection()
                .filter(function(item) {
                    return BEM.util.bemType(item) === 'block' && ~['md', 'wiki'].indexOf(item.tech);
                })
                //.reduce(BEM.util.uniq(BEM.util.bemKey), [])
                .map(function(item) {

                    var suffix = item.suffix.substr(1),
                        lang = suffix.split('.').shift(),
                        page = { block: source.split('/').shift() + '-' + item.block + '-' + lang },
                        srcPath = PATH.join(level.getPathByObj(item, suffix)),
                        outPath = PATH.join(bundlesLevel.getPathByObj(page, 'bemjson.js'));

                    return BEM.util.isFileValid(outPath, srcPath)
                        .then(function(valid) {

                            if (valid && !ctx.force) return;

                            return BEM.util.readFile(srcPath)
                                .then(function(src) {

                                    var pageContent = _this.getTemplateBemJson(item.block, source, lang),
                                        content = item.tech === 'wiki'?
                                            shmakowiki.shmakowikiToBemjson(src) :
                                            {
                                                block: 'b-text',
                                                mods: { 'type': 'global' },
                                                content: processMarkdown(src)
                                            };

                                    pageContent.content[1].content.push(content);

                                    mkdirp.sync('pages-desktop/' + page.block);

                                    var outContent = '(' + JSON.stringify(pageContent, null, 1) + ')';
                                    return BEM.util.writeFile(outPath, outContent);

                                });

                        });

                }, _this));

        }, []);

        return Q.all(promises)
            .then(function() {
                _this.done = true;
            });

    }

},
{

    createId: function(o) {
        return o.id;
    }

});


MAKE.decl('BundleNode', {

    getTechs: function() {
        return [
            'bemjson.js',
            'bemdecl.js',
            'deps.js',
            'bemhtml.js',
            'js',
            'css',
            'ie.css',
            'ie6.css',
            'ie7.css',
            'ie8.css',
            'ie9.css',
            'html'
        ];
    }

    // 'create-bemjson.js-node': function(tech, bundleNode, magicNode) {
    //     log(this);
    //     if (PATH.basename(this.level.dir) === 'simple.bundles' && this.item.block === 'index') {

    //         log('index');

    //         return;

    //         var blogDir = PATH.resolve(this.root, 'content/posts'),
    //             level = BEM.createLevel(blogDir),
    //             items = level.getItemsByIntrospection(),
    //             metaInfo;

    //         metaInfo = items
    //             .filter(function(item) {
    //                 return BEM.util.bemType(item) === 'block' && ~['metajson.js'].indexOf(item.tech);
    //             })
    //             .map(function(item) {
    //                 return VM.runInThisContext(FS.readFileSync(PATH.resolve(blogDir, item.block, item.block) + item.suffix, 'UTF8'));
    //             });

    //         FS.writeFileSync(PATH.resolve(PATH.join(this.root, 'desktop.bundles'), this.item.block, this.item.block) + '.bemjson.js', JSON.stringify(metaInfo));

    //         return;
    //     }
    //     return this.__base.apply(this, arguments);
    // }

});
