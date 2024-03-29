var mocha = require('mocha'),
    expect = require('expect.js'),
    q = require('q'),
    fs = require('q-fs'),
    path = require('path'),
    data = require('../lib/data'),
    bound = require('../lib/bound'),
    utility = require('../lib/utility'),
    child = require('child_process'),
    defer = q.defer,
    mochaIt = it;

utility.verbosity = 0;

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

describe('data', function() {

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
                
                resolver = data.createResolver(manuscript.cloneDirectory);
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

            describe('.fromMarkdown(markdown, filename)', function() {

            });

            describe('.fromJSON(json, filename)', function() {

            });

            describe('clearCache()', function() {


            });
        });
    });
});
