var path = require('path'),
    child = require('child_process'),
    marked = require('marked'),
    swig = require('swig'),
    datejs = require('datejs'),
    wrench = require('wrench'),
    mkdirp = require('mkdirp'),
    q = require('q'),
    fs = require('q-fs'),
    nodefs = require('fs'),
    defer = q.defer,
    reject = q.reject,
    ref = q.ref,
    homeDirectory = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'],
    boundDirectory = path.join(homeDirectory, '.bound'),
    verbose = false;


function log() {

    verbose && console.log.apply(console, arguments);
}

function exec(command) {

    var result = defer();

    child.exec(
        command,
        function(error) {

            error && result.reject(error);
            result.resolve();
        }
    );

    return result.promise;
}

function cpdir(directory, destination) {

    var result = defer();

    wrench.copyDirRecursive(
        directory,
        destination,
        function(error) {

            error && result.reject(error);
            result.resolve();
        }
    );

    return result.promise;
}

function rmdir(directory) {

    var result = defer();

    wrench.rmdirRecursive(
        directory,
        function(error) {
            
            error && result.reject(error);
            result.resolve();
        }
    );

    return result.promise;
}

function mkdir(directory) {

    var result = defer();

    mkdirp(
        directory,
        function(error) {

            error && result.reject(error);
            result.resolve();
        }
    );

    return result.promise;
}

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

Object.defineProperty(
    exports,
    'verbose',
    {
        get: function() {

            return verbose;
        },
        set: function(value) {

            verbose = value;
        }
    }
);

exports.bind = function(repositoryDirectory) {

    var initialize = function() {

            entryCache = {};
            templateCache = {};
            outputDirectory = path.join('/tmp', getRepositoryName());

            return mkdir(boundDirectory).then(
                function() {

                    return fs.exists(cloneDirectory).then(
                        function(exists) {

                            if(exists)
                                return exec('git --git-dir=' + path.join(cloneDirectory, '.git') + ' fetch').then(
                                    function() {
                                        
                                        return exec('git --git-dir=' + path.join(cloneDirectory, '.git') + ' --work-tree=' + cloneDirectory + ' merge origin/master');
                                    }
                                );

                            return exec('git clone ' + repositoryDirectory + ' ' + cloneDirectory);
                        }
                    )
                }
            );
        },
        discard = function() {

            return rmdir(outputDirectory);
        },
        reset = function() {

            return rmdir(cloneDirectory);
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
        readEntry = function(entryFilename) {

            if(entryFilename in entryCache)
                return ref(entryCache[entryFilename]);

            return fs.read(path.join(entryDirectory, entryFilename)).then(
                function(entryData) {

                    var entry = { attributes: {} },
                        entryMarkdown = entryData.toString(),
                        lexed = marked.lexer(entryMarkdown).filter(
                            function(token, index) {

                                if(index === 0 && token.type == 'code' && token.text)
                                    token.text.split('\n').forEach(
                                        function(header) {

                                            header = header.match(/([^:^\s]*)\s*:\s*(.*)$/i);
                                            entry.attributes[header[1].toLowerCase()] = header[2];
                                        }
                                    );
                                else
                                    return true;
                            }
                        );

                    entry.date = entry.attributes.date ? Date.parse(entry.attributes.date) : new Date(0);
                    entry.filename = entryFilename;
                    entry.markdown = entryMarkdown;
                    entry.html = marked.parser(lexed);

                    return entryCache[entryFilename] = entry;
                }
            );
        },
        readEntries = function(entryFilenames) {

            return (entryFilenames ? ref(entryFilenames) : listEntries()).then(
                function(entryFilenames) {

                    var next = ref([]);

                    entryFilenames.forEach(
                        function(entryFilename, index) {

                            next = next.then(
                                function(entries) {

                                    return readEntry(entryFilename).then(
                                        function(entry) {

                                            return entries.push(entry) && entries
                                        }
                                    );
                                }
                            );
                        }
                    );

                    return next;
                }
            );
        },
        loadTemplate = function(templatePath) {
            
            if(templatePath in templateCache)
                return ref(templateCache[templatePath]);

            return fs.read(path.join(templateDirectory, templatePath)).then(
                function(templateData) {
                    
                    swig.init(
                        {
                            allowErrors: false,
                            autoescape: true,
                            encoding: 'utf8',
                            root: outputDirectory
                        }
                    );

                    return templateCache[templatePath] = swig.compile(templateData.toString(), { filename: templatePath });
                }
            );
        },
        loadTemplates = function() {

            var templatePartialDirectory = path.join(templateDirectory, 'partials');

            return fs.exists(templatePartialDirectory).then(
                function(exists) {

                    return (!exists ? ref([]) : fs.list(templatePartialDirectory).then(
                        function(partialFilenames) {

                            return partialFilenames.map(
                                function(partialFilename) {

                                    return path.join('partials', partialFilename);
                                }
                            )
                        }
                    )).then(
                        function(partialPaths) {

                            var next = ref([]);

                            partialPaths.concat([ 'index.html', 'entry.html' ]).forEach(
                                function(templatePath) {

                                    next = next.then(
                                        function() {

                                            return loadTemplate(templatePath);
                                        }
                                    );
                                }
                            );

                            return next;
                        }
                    );
                }
            );
        },
        copyStaticContent = function() {

            return fs.exists(staticDirectory).then(
                function(exists) {

                    if(exists)
                        return cpdir(staticDirectory, outputDirectory);
                }
            );
        },
        writePage = function(templateFilename, templateData, outputSubdirectory, outputFilename) {

            return loadTemplate(templateFilename).then(
                function(template) {

                    var compiledPage = template(templateData);

                    return mkdir(path.join(outputDirectory, outputSubdirectory)).then(
                        function() {

                            log('Writing ' + path.join(outputSubdirectory, outputFilename));
                            return fs.write(path.join(outputDirectory, outputSubdirectory, outputFilename), new Buffer(compiledPage), { flags: 'w', mode: '0644' });
                        }
                    );
                }
            );
        },
        writeIndex = function(pageNumber) {

            return sortEntries().then(
                function(entries) {
                    
                    var pageCount = Math.floor(entries.length / pageSize),
                        firstEntryIndex = pageNumber * pageSize;

                    entries = entries.slice(firstEntryIndex, firstEntryIndex + pageSize);

                    if(!entries.length)
                        throw new Error('Page number "' + pageNumber + '" is out of bounds.');
                    
                    return writePage(
                        'index.html',
                        {
                            pageNumber: pageNumber,
                            pageCount: pageCount,
                            entries: entries
                        },
                        'page',
                        (pageNumber + 1) + ''
                    );
                }
            );
        },
        writeEntry = function(entryFilename) {

            return readEntry(entryFilename).then(
                function(entry) {

                    return writePage(
                        'entry.html',
                        entry,
                        'entry',
                        entryFilename.replace(/\.md$/i, '')
                    );
                }
            );
        },
        publish = function(newOutputDirectory, newPageSize) {

            pageSize = newPageSize || pageSize;
            outputDirectory = path.resolve(newOutputDirectory || outputDirectory);

            return copyStaticContent().then(
                function() {
                    return loadTemplates().then(
                        function() {

                            return getPageCount().then(
                                function(pageCount) {

                                    var next = ref();

                                    for(var i = 0; i < pageCount; i++)
                                        (function(pageIndex) {

                                            next = next.then(
                                                function() {
                                                    
                                                    return writeIndex(pageIndex);
                                                }
                                            );
                                        })(i);

                                    return next;
                                }
                            ).then(
                                function() {
                                    
                                    return listEntries().then(
                                        function(entryFilenames) {

                                            var next = ref();

                                            entryFilenames.forEach(
                                                function(entryFilename) {
                                                    
                                                    next = next.then(
                                                        function() {

                                                            return writeEntry(entryFilename);
                                                        }
                                                    );
                                                }
                                            );

                                            return next;
                                        }
                                    );
                                }
                            );
                        }
                    );
                }
            );
        },
        getEntryCount = function() {

            return listEntries().then(
                function(entries) {

                    return entries.length;
                }
            );
        },
        getPageCount = function() {

            return getEntryCount().then(
                function(entryCount) {
                    
                    return Math.floor(entryCount / pageSize) + 1;
                }
            );
        },
        getRepositoryName = function() {

            return repositoryDirectory.split(process.platform == 'win32' ? '\\' : '/').pop();
        },
        manuscript = {
            initialize: initialize,
            discard: discard,
            reset: reset,
            listEntries: listEntries,
            sortEntries: sortEntries,
            readEntry: readEntry,
            loadTemplate: loadTemplate,
            writeIndex: writeIndex,
            writeEntry: writeEntry,
            publish: publish,
        },
        cloneDirectory = path.join(boundDirectory, getRepositoryName()),
        entryDirectory = path.join(cloneDirectory, 'entries'),
        templateDirectory = path.join(cloneDirectory, 'templates'),
        staticDirectory = path.join(cloneDirectory, 'static'),
        outputDirectory = path.join('/tmp', getRepositoryName()),
        entryCache = {},
        templateCache = {},
        pageSize = 10;

    repositoryDirectory = path.resolve(repositoryDirectory);

    Object.defineProperty(manuscript, 'repositoryName', { get: getRepositoryName });

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

exports.cleanUp = function() {

    return rmdir(boundDirectory);
};

