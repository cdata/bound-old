var fs = require('q-fs'),
    path = require('path');

exports = module.exports = function(repositoryDirectory, outputDirectory, options) {

    var node = process.execPath,
        bound = process.argv[1],
        shellPrefix = '#!/bin/sh\n\n',
        hookPath = path.join(repositoryDirectory, 'hooks', 'post-receive'),
        boundCommand = [ node, bound, '-r', path.resolve(repositoryDirectory), '-o', path.resolve(outputDirectory) ];

    return fs.exists(path.resolve(hookPath)).then(
        function(hookExists) {

            if(hookExists)
                console.error("A post-receive hook already exists. Cowardly refusing to modify it.");
            else {

                console.log("Creating post-receive hook at " + hookPath);
                
                return fs.write(path.resolve(hookPath), shellPrefix + boundCommand.join(' '), { mode: '0777', flags: 'w' });
            }
        }
    );
};
