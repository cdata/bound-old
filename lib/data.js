var path = require('path'),
    marked = require('marked'),
    datejs = require('datejs'),
    fs = require('q-fs'),
    q = require('q'),
    utility = require('./utility'),
    defer = q.defer,
    reject = q.reject,
    ref = q.ref;

exports.createResolver = function(baseDirectory) {

    var cache = {};

    function fromJSON(json, filename) {

        var data;

        try {
            data = JSON.parse(json);
            data.content = data.content || {};
        } catch(e) {
            data = { content: {} };
        }

        data.content.json = json;
        data.content.filename = filename;

        return ref(data);
    }

    function fromMarkdown(markdown, filename) {

        var data = { content: {} },
            lexed = marked.lexer(markdown).filter(
                function(token, index) {

                    if(index === 0 && token.type == 'code' && token.text)
                        token.text.split('\n').forEach(
                            function(header) {

                                header = header.match(/([^:^\s]*)\s*:\s*(.*)$/i);
                                data[header[1].toLowerCase()] = header[2];
                            }
                        );
                    else
                        return true;
                }
            );

        data.content.date = data.date ? Date.parse(data.date) : new Date(0);
        data.content.markdown = markdown;
        data.content.html = marked.parser(lexed);
        data.content.filename = filename;
        data.toString = function() {

            return path.join(data.content.date.toPath(), filename).replace(path.extname(filename), '.html');
        };

        return ref(data);
    }

    function fromFile(filePath) {
        
        if(filePath in cache)
            return cache[filePath];

        return fs.read(path.join(baseDirectory, filePath)).then(
            function(contents) {

                var extension = path.extname(filePath),
                    filename = path.basename(filePath);

                contents = contents && contents.toString();

                if(/\.(markdown|md|mkd|gfm)/.test(extension))
                    return cache[filePath] = fromMarkdown(contents, filename);

                if(/\.(json)/.test(extension))
                    return cache[filePath] = fromJSON(contents, filename);

                throw new Error('File "' + filePath + '" is in an incompatible format.');
            }
        );
    }

    function clearCache() {
        
        cache = {};
    }

    return {
        fromFile: fromFile,
        fromMarkdown: fromMarkdown,
        fromJSON: fromJSON,
        clearCache: clearCache
    };
}
