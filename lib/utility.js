var child = require('child_process'),
    path = require('path'),
    wrench = require('wrench'),
    mkdirp = require('mkdirp'),
    q = require('q'),
    fs = require('q-fs'),
    argv = require('optimist').argv,
    defer = q.defer,
    reject = q.reject,
    ref = q.ref,
    fsWrite = fs.write,
    verbose = 0;

Object.defineProperty(
    exports,
    'verbosity',
    {
        get: function() { return verbose; },
        set: function(value) {

            verbose = value;
        }
    }
);

fs.write = function(path) {

    log("Writing " + path);
    fsWrite.apply(fs, arguments);
}

Date.prototype.toPath = function toPath() {

    var year = this.getFullYear().toString(),
        month = (this.getMonth() + 1).toString(),
        date = this.getDate().toString();

    month = month.length === 1 ? '0' + month : month;
    date = date.length === 1 ? '0' + date : date;

    return path.join(year, month, date);
}

var log = exports.log = function() {

    verbose && console.log.apply(console, arguments);
}

var debug = exports.debug = function() {

    verbose > 1 && console.log.apply(console, arguments);
}

var error = exports.error = function() {

    verbose && console.error.apply(console, arguments);
}

var each = exports.each = function(list, callback) {

    var result = ref();

    list.forEach(
        function() {

            var args = arguments,
                context = this;

            result = result.then(
                function() {

                    return callback.apply(context, args);
                }
            );
        }
    );

    return result;
};

exports.exec = function exec(command) {

    var result = defer();

    debug('Execute: ' + command);

    child.exec(
        command,
        function(error) {

            error && result.reject(error);
            result.resolve();
        }
    );

    return result.promise;
};

var cpdir = exports.cpdir = function(directory, destination) {

    var result = defer();

    debug('Copy: ' + directory + ' => ' + destination);

    wrench.copyDirRecursive(
        directory,
        destination,
        function(error) {

            error && result.reject(error);
            result.resolve();
        }
    );

    return result.promise;
};

var rmdir = exports.rmdir = function(directory) {

    var result = defer();

    debug('Remove: ' + directory);

    fs.exists(directory).then(
        function(exists) {

            if(exists)
                wrench.rmdirRecursive(
                    directory,
                    function(error) {
                        
                        error && result.reject(error);
                        result.resolve();
                    }
                );
            else
                result.resolve();
        }
    );

    return result.promise;
};

var mkdir = exports.mkdir = function(directory) {

    var result = defer();

    debug('Make: ' + directory);

    mkdirp(
        directory,
        function(error) {

            error && result.reject(error);
            result.resolve();
        }
    );

    return result.promise;
};

var lsdir = exports.lsdir = function(directory) {

    return fs.listTree(directory).then(
        function(list) {

            var fileList = [];

            return each(
                list,
                function(fullPath) {

                    return fs.isDirectory(fullPath).then(
                        function(isDirectory) {

                            if(!isDirectory)
                                fileList.push(path.relative(path.resolve(directory), fullPath));
                        }
                    );
                }
            ).then(
                function() {

                    return fileList;
                }
            );
        }
    );
};

