var mocha = require('mocha'),
    expect = require('expect.js'),
    q = require('q'),
    fs = require('q-fs'),
    path = require('path'),
    bound = require('../lib/bound'),
    child = require('child_process'),
    defer = q.defer,
    mochaIt = it;



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

describe('bound', function() {

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


    describe('.bind(repositoryLocation)', function() {

        it('takes a repo path and resolves a manuscript instance', function() {
            
            expect(manuscript).to.be.an(Object);
        });

        it('rejects the result when the repo path is invalid', function() {

            return bound.bind('./sample-bolg.git').then(
                function() {

                    throw new Error("Expected bind result to be rejected.");
                },
                function(error) {

                    expect(error).to.be.an(Error);
                }
            );
        });

        describe('manuscript', function() {

            beforeEach(function(done) {

                manuscript.reset().then(
                    function() {
                        
                        return manuscript.initialize();
                    }
                ).then(
                    function() {

                        done();
                    },
                    function(error) {

                        done(error);
                    }
                );
            });

            afterEach(function(done) {

                child.exec(
                    'rm -rf ' + manuscript.outputDirectory,
                    function(error) {

                        done(error);
                    }
                );
            });


            describe('.initialize()', function() {

                it('clones the target repository if it is new', function() {

                    return fs.exists(path.join(bound.boundDirectory, manuscript.repositoryName)).then(
                        function(exists) {

                            expect(exists).to.be(true);
                        }
                    );
                });

                it('updates the target repository if it exists', function() {

                    return manuscript.initialize();
                });

            });

            describe('.outputDirectory', function() {

                it('is the path where the manuscript will be published to', function() {

                    expect(manuscript.outputDirectory).to.be.ok();
                    expect(manuscript.outputDirectory).to.be.a('string');
                    expect(manuscript.outputDirectory).to.be('/tmp/sample-blog.git');
                });

                it('can be changed to suit your needs', function() {

                    manuscript.outputDirectory = '/tmp/foobar';

                    expect(manuscript.outputDirectory).to.be('/tmp/foobar');
                });
            });

            describe('.repositoryName', function() {

                it('returns the name of the repository being bound', function() {

                    expect(manuscript.repositoryName).to.be.ok();
                    expect(manuscript.repositoryName).to.be('sample-blog.git');
                });
            });

            describe('.listEntries()', function() {

                it('resolves a list of manuscript entries', function() {

                    return manuscript.listEntries().then(
                        function(entries) {

                            expect(entries).to.be.an(Array);
                            expect(entries.length).to.not.be(0);
                            expect(entries[0]).to.match(/.*\.md$/);
                        }
                    );
                });
            });
            
            describe('.readEntry(entryFilename)', function() {

                it('resolves an entry when the entry exists', function() {

                    return manuscript.readEntry('a-sample-post.md').then(
                        function(entry) {

                            expect(entry).to.be.an(Object);
                        }
                    );
                });

                it('rejects an entry when the entry does not exist', function() {

                    manuscript.readEntry('a-sample-psot.md').then(
                        function(entry) {
                            
                            throw new Error('A non-existant entry should not resolve.');
                        },
                        function(error) {

                            expect(error).to.be.an(Error);
                        }
                    );
                });

                describe('entry', function() {

                    var entry;

                    beforeEach(function(done) {

                        manuscript.readEntry('a-sample-post.md').then(
                            function(_entry) {

                                entry = _entry;
                                done();
                            },
                            function(error) {

                                done(error);
                            }
                        );
                    });

                    it('is an object', function() {
                        
                        expect(entry).to.be.an(Object);
                    });

                    it('has a markdown property that is a string', function() {

                        expect(entry).to.have.key('markdown');
                        expect(entry.markdown).to.be.a('string');
                    });

                    it('has an html property that is a string', function() {

                        expect(entry).to.have.key('html');
                        expect(entry.html).to.be.a('string');
                    });

                    it('has an attributes property that is an object', function() {

                        expect(entry).to.have.key('attributes');
                        expect(entry.attributes).to.be.an(Object);
                    });

                    it('has a date property that is a date', function() {

                        expect(entry).to.have.key('date');
                        expect(entry.date).to.be.a(Date);
                    });
                });
            });

            describe('.sortEntries()', function() {

                it('resolves a chronologically sorted list of entries', function() {

                    return manuscript.sortEntries().then(
                        function(sortedEntries) {

                            var last = new Date();

                            sortedEntries.forEach(
                                function(entry) {

                                    expect(entry.date).to.be.lessThan(last);
                                    last = entry.date;
                                }
                            );
                        }
                    );
                });
            });

            describe('.loadTemplate(templatePath)', function() {

                it('resolves a template function for the given path', function() {

                    return manuscript.loadTemplate('index.html').then(
                        function(template) {

                            expect(template).to.be.a(Function);
                        }
                    );
                });
            });

            describe('.writeIndex(pageNumber)', function() {

                it('creates a file for the specified page number', function() {

                    return manuscript.writeIndex(0).then(
                        function() {

                            return fs.exists(path.join(manuscript.outputDirectory, 'page/1')).then(
                                function(exists) {

                                    expect(exists).to.be(true);
                                }
                            );
                        }
                    );
                });
            });

            describe('.writeEntry(entryFilename)', function() {

                it('creates a file for the specified entry filename', function() {

                    return manuscript.writeEntry('a-sample-post.md').then(
                        function() {

                            return fs.exists(path.join(manuscript.outputDirectory, 'entry/a-sample-post')).then(
                                function(exists) {

                                    expect(exists).to.be(true);
                                }
                            );
                        }
                    );
                });
            });

            describe('.publish()', function() {

                it('creates a published copy of the manuscript', function() {

                    return manuscript.publish().then(
                        function() {

                            return fs.exists(manuscript.outputDirectory).then(
                                function(exists) {

                                    expect(exists).to.be(true);

                                    return fs.exists(path.join(manuscript.outputDirectory, 'page/1')).then(
                                        function(exists) {
                                            
                                            expect(exists).to.be(true);

                                            return fs.exists(path.join(manuscript.outputDirectory, 'entry/a-sample-post')).then(
                                                function(exists) {

                                                    expect(exists).to.be(true);
                                                }
                                            );
                                        }
                                    );
                                }
                            );
                        }
                    );

                });
            });

            describe('.reset()', function() {

                it('removes the bound repository\'s clone in the bound directory', function() {

                    return manuscript.reset().then(
                        function() {

                            return fs.exists(path.join(bound.cloneDirectory, manuscript.repositoryName)).then(
                                function(exists) {

                                    expect(exists).to.be(false);
                                }
                            );
                        }
                    );
                });
            });
        });
    });

    describe('.cleanUp()', function() {

        it('removes the bound root directory', function() {

            bound.cleanUp().then(
                function() {
                    return fs.exists(bound.cloneDirectory).then(
                        function(exists) {

                            expect(exists).to.be(false);
                        }
                    )
                }
            );
        });
    });

});
