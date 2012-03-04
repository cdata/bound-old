var mocha = require('mocha'),
    expect = require('expect.js'),
    q = require('q'),
    fs = require('q-fs'),
    path = require('path'),
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
            
            describe('.readEntries()', function() {

                it('resolves an array of entries populated from files', function() {

                    return manuscript.readEntries().then(
                        function(entries) {

                            expect(entries).to.be.an(Array);
                            expect(entries.length).to.be.greaterThan(0);
                        }
                    );
                });

                describe('entry', function() {

                    var entry;

                    beforeEach(function(done) {

                        manuscript.readEntries().then(
                            function(entries) {

                                entry = entries[0];
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

                    it('has a content property that is an object', function() {

                        expect(entry).to.have.key('content');
                        expect(entry.content).to.be.an(Object);
                    });

                    it('has a content.markdown property that is a string', function() {

                        expect(entry.content).to.have.key('markdown');
                        expect(entry.content.markdown).to.be.a('string');
                    });

                    it('has a content.html property that is a string', function() {

                        expect(entry.content).to.have.key('html');
                        expect(entry.content.html).to.be.a('string');
                    });

                    it('has a content.date property that is a date', function() {

                        expect(entry.content).to.have.key('date');
                        expect(entry.content.date).to.be.a(Date);
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

                                    expect(entry).to.be.ok();
                                    expect(entry.content).to.be.ok();
                                    expect(entry.content.date).to.be.a(Date);
                                    expect(entry.content.date).to.be.lessThan(last);

                                    last = entry.content.date;
                                }
                            );
                        }
                    );
                });
            });

            describe('.loadTemplates()', function() {

                it('resolves a list of template functions for the given repository', function() {

                    return manuscript.loadTemplates().then(
                        function(templates) {

                            expect(templates).to.be.an(Array);

                            templates.forEach(
                                function(template) {

                                    expect(template).to.be.an(Object);
                                    expect(template).to.have.key('render');
                                    expect(template).to.have.key('content');
                                    expect(template).to.have.key('path');
                                }
                            );
                        }
                    );
                });
            });

            describe('.writePages()', function() {

                it('creates the final versions of all pages in the output directory', function() {

                    return manuscript.writePages().then(
                        function() {

                            return fs.exists(path.join(manuscript.outputDirectory, 'a-sample-page.html')).then(
                                function(exists) {

                                    expect(exists).to.be(true);
                                }
                            );
                        }
                    );
                });

                it('creates a series of unbound data files in the output directory', function() {

                    return manuscript.writePages().then(
                        function() {

                            return fs.exists(path.join(manuscript.outputDirectory, 'unbound', 'a-sample-page.json')).then(
                                function(exists) {

                                    expect(exists).to.be(true);
                                }
                            );
                        }
                    );
                });
            });

            describe('.writeEntries()', function() {

                it('creates a chronological hierarchy of rendered entries', function() {

                    return manuscript.writeEntries().then(
                        function() {

                            return fs.exists(path.join(manuscript.outputDirectory, 'entries', '2012', '02', '19', 'a-sample-post.html')).then(
                                function(exists) {

                                    expect(exists).to.be(true);
                                }
                            );
                        }
                    );
                });

                it('creates an archival reference of all existing entries', function() {

                    return manuscript.writeEntries().then(
                        function() {

                            return fs.exists(path.join(manuscript.outputDirectory, 'entries', 'index.html')).then(
                                function(exists) {

                                    expect(exists).to.be(true);
                                }
                            );
                        }
                    );
                })
            });

            describe('.publish()', function() {

                it('creates a published copy of the manuscript', function() {

                    return manuscript.publish().then(
                        function() {

                            return fs.exists(manuscript.outputDirectory).then(
                                function(exists) {

                                    expect(exists).to.be(true);

                                    return fs.exists(path.join(manuscript.outputDirectory, 'robots.txt')).then(
                                        function(exists) {

                                            expect(exists).to.be(true);

                                            return fs.exists(path.join(manuscript.outputDirectory, 'a-sample-page.html')).then(
                                                function(exists) {
                                                    
                                                    expect(exists).to.be(true);

                                                    return fs.exists(path.join(manuscript.outputDirectory, 'entries', '2012', '02', '19', 'a-sample-post.html')).then(
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

    describe('.remove()', function() {

        it('removes the bound root directory', function() {

            return bound.remove().then(
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
