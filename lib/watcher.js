var gitEmit = require('git-emit'),
    path = require('path'),
    bound = require('./bound');

/* NOTE: This feature has been tabled in favor of manual hooking */

exports.watch = function(repositoryDirectory, settings) {

    gitEmit(
        path.resolve(repositoryDirectory), 
        function(error, emitter) {
    
            bound.bind(repositoryDirectory).then(
                function(manuscript) {

                    settings && (function() {

                        for(var setting in settings)
                            manuscript[setting] = settings[setting];

                    })();

                    return manuscript.publish().then(
                        function() {

                            console.log('Bound has started watching ' + repositoryDirectory + ' as of ' + new Date());
                            emitter.on(
                                'post-receive',
                                function() {

                                    manuscript.discard().then(
                                        function() {

                                            return manuscript.publish();
                                        }
                                    ).then(
                                        function() {

                                            console.log(repositoryDirectory + ' finished publishing @ ' + new Date());
                                        },
                                        function(error) {

                                            console.error(error.message);
                                        }
                                    )
                                }
                            );
                        }
                    );
                },
                function(error) {

                    console.error(error.message);

                    emitter.removeAllListeners('post-receive');
                    emitter.close();

                    process.exit(1);
                }
            );
        }
    );
};
