var path = require('path'),
    q = require('q'),
    fs = require('q-fs'),
    nodefs = require('fs'),
    utility = require('./utility'),
    data = require('./data'),
    template = require('./template'),
    defer = q.defer,
    reject = q.reject,
    ref = q.ref,
    homeDirectory = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'],
    boundDirectory = path.join(homeDirectory, '.bound');

Object.defineProperty(
    exports,
    'cloneDirectory',
    {
        get: function() {

            return boundDirectory;
        },
        set: function(value) {

            boundDirectory = path.resolve(value);
        }
    }
);

exports.bind = function(repositoryDirectory) {

    var initialize = function() {

            entryCache = {};
            templateCache = {};
            outputDirectory = path.join('/tmp', path.basename(repositoryDirectory));
            pageSize = 10;

            return utility.mkdir(boundDirectory).then(
                function() {

                    return fs.exists(cloneDirectory).then(
                        function(exists) {

                            if(exists)
                                return utility.exec('git --git-dir=' + path.join(cloneDirectory, '.git') + ' fetch').then(
                                    function() {
                                        
                                        return utility.exec('git --git-dir=' + path.join(cloneDirectory, '.git') + ' --work-tree=' + cloneDirectory + ' merge origin/master');
                                    }
                                );

                            return utility.exec('git clone ' + repositoryDirectory + ' ' + cloneDirectory);
                        }
                    )
                }
            );
        },
        discard = function() {

            return utility.rmdir(outputDirectory);
        },
        reset = function() {

            return utility.rmdir(cloneDirectory);
        },
        listEntries = function() {

            return fs.list(entryDirectory);
        },
        sortEntries = function() {

            return readEntries().then(
                function(entries) {

                    var sorted = [];

                    entries.forEach(
                        function(entry) {

                            var date = entry.date;

                            sorted.splice(
                                (function(alpha, omega) {

                                    var mid = Math.floor((omega - alpha) / 2) + alpha,
                                        dateAtMid = sorted[mid] && sorted[mid].date;

                                    if(alpha === omega)
                                        return mid;

                                    if(dateAtMid < date)
                                        return arguments.callee(alpha, mid);

                                    if(dateAtMid > date)
                                        return arguments.callee(mid + 1, omega);

                                    return mid;
                                })(0, sorted.length),
                                0,
                                entry
                            );
                        }
                    );

                    return sorted;
                }
            );
        },
        readEntries = function(entryFilenames) {

            return (entryFilenames ? ref(entryFilenames) : listEntries()).then(
                function(entryFilenames) {
                    
                    var entries = [];

                    return utility.each(
                        entryFilenames,
                        function(entryFilename) {

                            return dataResolver.fromFile(path.join('entries', entryFilename)).then(
                                function(entry) {

                                    entries.push(entry);
                                }
                            ).then(
                                function() {

                                    return entries;
                                }
                            );
                        }
                    );
                }
            );
        },
        loadTemplates = function() {

            return utility.lsdir(templateDirectory).then(
                function(templatePaths) {

                    var templates = [];

                    return utility.each(
                        templatePaths,
                        function(templatePath) {

                            return templateResolver.fromFile(templatePath).then(
                                function(template) {

                                    templates.push(template);
                                }
                            );
                        }
                    ).then(
                        function() {

                            return templates;
                        }
                    );
                }
            );
        },
        writeTemplates = function() {

            return loadTemplates().then(
                function(templates) {

                    return utility.each(
                        templates,
                        function(template) {

                            return writeUnbound(path.join('templates', template.path), template.content);
                        }
                    );
                }
            );
        },
        copyStaticContent = function() {

            return fs.exists(staticDirectory).then(
                function(exists) {

                    if(exists)
                        return utility.cpdir(staticDirectory, outputDirectory);
                }
            );
        },
        writeBound = function(outputPath, templatePath, templateData) {

            return templateResolver.fromFile(templatePath).then(
                function(template) {

                    var compiledPage = template.render(templateData),
                        fullOutputPath = path.join(outputDirectory, outputPath);

                    return utility.mkdir(path.dirname(fullOutputPath)).then(
                        function() {

                            utility.log('Writing ' + outputPath);
                            return fs.write(fullOutputPath, new Buffer(compiledPage), { mode: '0644' });
                        }
                    );
                }
            );
        },
        writeUnbound = function(outputPath, data) {

            var fullOutputPath = path.join(outputDirectory, 'unbound', outputPath);

            return utility.mkdir(path.dirname(fullOutputPath)).then(
                function() {

                    utility.log('Writing ' + outputPath);

                    return fs.write(fullOutputPath, new Buffer(typeof data == 'string' ? data : JSON.stringify(data)), { mode: '0644' });
                }
            );
        },
        writeEntries = function() {

            return sortEntries().then(
                function(entries) {

                    return utility.each(
                        entries,
                        function(entry, index) {

                            var entryPath = path.join('entries', entry.toString()),
                                entryTemplate = entry.template || 'entry.html',
                                nextEntry = entries[index + 1],
                                previousEntry = entries[index - 1];

                            if(nextEntry)
                                entry.nextEntry = {
                                    title: nextEntry.title,
                                    path: path.join('entries', nextEntry.toString())
                                };

                            if(previousEntry)
                                entry.previousEntry = {
                                    title: previousEntry.title,
                                    path: path.join('entries', previousEntry.toString())
                                };

                            return writeBound(entryPath, entryTemplate, entry).then(
                                function() {
                                    
                                    entryPath = entryPath.replace(/\.html$/, '.json');
                                    
                                    if(nextEntry)
                                        entry.nextEntry.path = path.join('unbound', entry.nextEntry.path.replace(/\.html$/, '.json'));

                                    if(previousEntry)
                                        entry.previousEntry.path = path.join('unbound', entry.previousEntry.path.replace(/\.html$/, '.json'));

                                    return writeUnbound(entryPath, entry);
                                }
                            );
                        }
                    ).then(
                        function() {

                            return writeBound(path.join('entries', 'index.html'), 'archive.html', entries).then(
                                function() {

                                    return writeUnbound(path.join('entries', 'index.html'), entries);
                                }
                            );
                        }
                    );
                }
            );
        },
        writePages = function() {

            return utility.lsdir(pageDirectory).then(
                function(pagePaths) {

                    return utility.each(
                        pagePaths,
                        function(pagePath) {

                            var fullPagePath = path.join('pages', pagePath);

                            return dataResolver.fromFile(fullPagePath).then(
                                function(page) {

                                    pagePath = pagePath.replace(path.extname(pagePath), '.html');

                                    return writeBound(pagePath, page.template || 'page.html', page).then(
                                        function() {

                                            pagePath = pagePath.replace(/\.html$/, '.json');

                                            return writeUnbound(pagePath, page);
                                        }
                                    );
                                }
                            );
                        }
                    );
                }
            );
        },
        publish = function(newOutputDirectory, newPageSize) {

            outputDirectory = path.resolve(newOutputDirectory || outputDirectory);

            return copyStaticContent().then(
                function() {
                    return writeTemplates().then(
                        function() {
                            return writeEntries().then(
                                function() {
                                    return writePages();
                                }
                            );
                        }
                    );
                }
            );
        },
        manuscript = {
            initialize: initialize,
            discard: discard,
            reset: reset,
            copyStaticContent: copyStaticContent,
            listEntries: listEntries,
            sortEntries: sortEntries,
            readEntries: readEntries,
            loadTemplates: loadTemplates,
            writeTemplates: writeTemplates,
            writeEntries: writeEntries,
            writePages: writePages,
            writeBound: writeBound,
            writeUnbound: writeUnbound,
            publish: publish,
        },
        cloneDirectory = path.join(boundDirectory, path.basename(repositoryDirectory)),
        entryDirectory = path.join(cloneDirectory, 'entries'),
        pageDirectory = path.join(cloneDirectory, 'pages'),
        templateDirectory = path.join(cloneDirectory, 'templates'),
        staticDirectory = path.join(cloneDirectory, 'static'),
        dataResolver = data.createResolver(cloneDirectory),
        templateResolver = template.createResolver(templateDirectory),
        outputDirectory,
        entryCache,
        templateCache,
        pageSize;

    repositoryDirectory = path.resolve(repositoryDirectory);

    Object.defineProperty(
        manuscript,
        'repositoryName',
        {
            get: function() {

                return path.basename(repositoryDirectory);
            },
            set: function() {}
        }
    );

    Object.defineProperty(
        manuscript, 
        'outputDirectory',
        {
            get: function() {

                return outputDirectory;
            },
            set: function(value) {

                outputDirectory = value;
            }
        }
    );

    Object.defineProperty(
        manuscript,
        'cloneDirectory',
        {
            get:function() {

                return cloneDirectory;
            },
            set: function() {}
        }
    );

    return fs.exists(repositoryDirectory).then(
        function(exists) {

            if(!exists)
                throw new Error("Provided repository directory '" + repositoryDirectory + "' does not exist.");

            return initialize().then(
                function() {

                    return manuscript;
                }
            );
        }
    );
};

exports.remove = function() {

    return utility.rmdir(boundDirectory);
};
