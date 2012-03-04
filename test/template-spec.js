var mocha = require('mocha'),
    expect = require('expect.js'),
    q = require('q'),
    fs = require('q-fs'),
    path = require('path'),
    template = require('../lib/template'),
    bound = require('../lib/bound'),
    child = require('child_process'),
    argv = require('optimist').argv,
    defer = q.defer,
    mochaIt = it;

argv.verbose = 0;

it = function(attribute, callback) {

    mochaIt(attribute, function(done) {

        q.ref(callback.call(this)).then(
            function() {

                done();
            },
            function(error) {

                done(error);
            }
        );
    });
};

describe('template', function() {

    var manuscript;

    beforeEach(
        function(done) {

            bound.bind('./sample-blog.git').then(
                function(_manuscript) {

                    manuscript = _manuscript;
                    done();
                },
                function(error) {

                    done(error);
                }
            );
        }
    );

    afterEach(
        function(done) {

            manuscript.reset().then(
                function() {

                    done();
                },
                function(error) {

                    done(error);
                }
            );
        }
    );

    describe('createResolver(baseDirectory)', function() {

        var resolver;

        beforeEach(
            function() {
                
                resolver = template.createResolver(path.join(manuscript.cloneDirectory, 'templates'));
            }
        );

        it('takes a base directory and returns a resolver instance', function() {

            expect(resolver).to.be.an(Object);
        });

        describe('resolver', function() {

            beforeEach(
                function() {

                    resolver.clearCache();
                }
            );

            describe('.fromFile(filePath)', function() {

            });

            describe('.fromSwig(templateContents, filePath)', function() {

            });

            describe('clearCache()', function() {

            });
        });
    });
});
