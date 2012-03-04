var path = require('path'),
    swig = require('swig'),
    fs = require('q-fs'),
    q = require('q'),
    defer = q.defer,
    reject = q.reject,
    ref = q.ref;

exports.createResolver = function(baseDirectory) {

    var cache = {};

    function fromSwig(templateContents, templatePath) {

        return ref(
            {
                render: swig.compile(templateContents, { filename: templatePath }),
                content: templateContents,
                path: templatePath
            }
        );
    }

    function fromFile(templatePath) {

        if(templatePath in cache)
            return cache[templatePath];

        return fs.read(path.join(baseDirectory, templatePath)).then(
            function(contents) {

                var templateMatch = templatePath.match(/.*\.([^\.]*)\.[^\.]*$/),
                    type = templateMatch ? templateMatch[1] : 'swig';

                templatePath = templatePath.replace('.' + type, '');

                contents = contents && contents.toString();

                // TODO: Switch on type to support other template formats..

                return cache[templatePath] = fromSwig(contents, templatePath); 
            }
        );
    }

    function clearCache() {

        cache = {};
    }

    swig.init(
        {
            allowErrors: false,
            autoescape: true,
            encoding: 'utf8',
            root: '/'
        }
    );

    return {
        fromFile: fromFile,
        fromSwig: fromSwig
    };
}
