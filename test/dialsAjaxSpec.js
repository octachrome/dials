'use strict';

describe('Dials-Ajax', function() {
    var operations;

    beforeEach(function () {
        operations = [];

        Dials.onComplete(function(op) {
            operations.push(deepCopy(op));
        });

        this.addMatchers({
            toNearlyEqual: function(o) {
                return nearlyEquals.call(this, this.actual, o, 5);
            }
        });
    });

    it('should not record Ajax.Requests outside of tracked functions', function() {
        var json;

        new Ajax.Request('base/test-data/test.json', {method: 'get', onSuccess: function(transport) {
            json = transport.responseText;
        }});

        waitsFor(function() {
            return json;
        }, 'Ajax request should succeed', 1000);

        runs(function() {
            expect(/{"test":true}/.match(json)).toBe(true);
            expect(operations).toEqual([]);
        })
    });

    it('should record Ajax.Requests within tracked functions', function() {
        var json;

        var f = Dials.tracked(function myOp() {
            new Ajax.Request('base/test-data/test.json', {
                method: 'get',
                onSuccess: function onSuccess(transport) {
                    var j = transport.responseText;
                    setTimeout(function nested() {
                        json = j;
                    }, 1);
                },
                onFailure: function onFailure() {
                    // do nothing
                }
            });
        });

        var t0 = now();
        f();

        waitsFor(function() {
            return json;
        }, 'Ajax request should succeed', 1000);

        runs(function() {
            expect(/{"test":true}/.match(json)).toBe(true);

            expect(operations).toNearlyEqual([{
                t0: t0,
                name: 'myOp',
                queued: 0,
                started: 0,
                duration: 0,
                totalDuration: '*',
                success: true,
                calls: [{
                    cause: 'timeout',   // a timeout set by prototype.js internally
                    queued: 0,
                    started: '*',
                    duration: 0,
                    success: true
                },
                {
                    cause: 'ajax:base/test-data/test.json',
                    queued: 0,
                    started: '*',   // takes anywhere between 5ms and 300ms to complete the request
                    duration: 0,
                    success: true,
                    calls: [{
                        cause: 'timeout',
                        name: 'nested',
                        queued: '*',
                        started: '*',
                        duration: 0,
                        success: true
                    }]
                }]
            }]);
        })
    });

    it('should record failing Ajax.Requests within tracked functions', function() {
        var failed;

        var f = Dials.tracked(function myOp() {
            new Ajax.Request('base/missing.json', {
                method: 'get',
                onSuccess: function onSuccess() {
                    // do nothing
                },
                onFailure: function onFailure() {
                    setTimeout(function nested() {
                        failed = true;
                    }, 1);
                }
            });
        });

        var t0 = now();
        f();

        waitsFor(function() {
            return failed;
        }, 'Ajax request should have failed');

        runs(function() {
            expect(operations).toNearlyEqual([{
                t0: t0,
                name: 'myOp',
                queued: 0,
                started: 0,
                duration: 0,
                totalDuration: '*',
                success: true,
                calls: [{
                    cause: 'timeout',   // a timeout set by prototype.js internally
                    queued: 0,
                    started: '*',
                    duration: 0,
                    success: true
                },{
                    cause: 'ajax:base/missing.json',
                    queued: 0,
                    started: '*',   // takes anywhere between 5ms and 300ms to complete the request
                    duration: 0,
                    success: true,
                    calls: [{
                        cause: 'timeout',
                        name: 'nested',
                        queued: '*',
                        started: '*',
                        duration: 0,
                        success: true
                    }]
                }]
            }]);
        });
    });

    it('should record completion of Ajax.Requests within tracked functions', function() {
        var complete;

        var f = Dials.tracked(function myOp() {
            new Ajax.Request('base/missing.json', {
                method: 'get',
                onComplete: function onComplete() {
                    complete = true;
                }
            });
        });

        var t0 = now();
        f();

        waitsFor(function() {
            return complete;
        }, 'Ajax request should have completed');

        runs(function() {
            expect(operations).toNearlyEqual([{
                t0: t0,
                name: 'myOp',
                queued: 0,
                started: 0,
                duration: 0,
                totalDuration: '*',
                success: true,
                calls: [{
                    cause: 'timeout',   // a timeout set by prototype.js internally
                    queued: 0,
                    started: '*',
                    duration: 0,
                    success: true
                },
                {
                    cause: 'ajax:base/missing.json',
                    queued: 0,
                    started: '*',   // takes anywhere between 5ms and 300ms to complete the request
                    duration: 0,
                    success: true
                }]
            }]);
        });
    });

    it('should record completion of Ajax.Requests with onComplete, onSuccess and onFailure callbacks', function() {
        var failed;
        var complete;

        var f = Dials.tracked(function myOp() {
            new Ajax.Request('base/missing.json', {
                method: 'get',
                onSuccess: function onSuccess() {
                    // do nothing
                },
                onFailure: function onFailure() {
                    setTimeout(function failure() {
                        failed = true;
                    }, 1);
                },
                onComplete: function onComplete() {
                    setTimeout(function completion() {
                        complete = true;
                    }, 1);
                }
            });
        });

        var t0 = now();
        f();

        waitsFor(function() {
            return failed && complete;
        }, 'Ajax request should have completed');

        runs(function() {
            expect(failed).toBe(true);

            expect(operations).toNearlyEqual([{
                t0: t0,
                name: 'myOp',
                queued: 0,
                started: 0,
                duration: 0,
                totalDuration: '*',
                success: true,
                calls: [{
                    cause: 'timeout',   // a timeout set by prototype.js internally
                    queued: 0,
                    started: '*',
                    duration: 0,
                    success: true
                },
                {
                    cause: 'ajax:base/missing.json',
                    queued: 0,
                    started: '*',   // takes anywhere between 5ms and 300ms to complete the request
                    duration: 0,
                    success: true,
                    calls: [                    {
                        cause: 'timeout',
                        name: 'failure',
                        queued: '*',
                        started: '*',
                        duration: 0,
                        success: true
                    },
                    {
                        cause: 'timeout',
                        name: 'completion',
                        queued: '*',
                        started: '*',
                        duration: 0,
                        success: true
                    }]
                }]
            }]);
        });
    });

    function loadScript(url, onSuccess) {
        Dials.fork(function(wrap) {
            var script = document.createElement('script');
            var wrapped = wrap(onSuccess);
            script.onreadystatechange = function() {
                if (this.readyState == 'complete') {
                    wrapped();
                }
            };
            script.onload = wrapped();
            script.src = url;
            var head = document.getElementsByTagName('head')[0];
            head.appendChild(script);
        });
    }

    it('should ignore custom asynchronous callbacks outside a defined operation', function() {
        expect(window.test1).not.toBe(true);

        var done;
        loadScript('base/test-data/test1.js', function onSuccess() {
            done = true;
        });

        waitsFor(function() {
            return done && window.test1;
        }, 'Should load script');

        runs(function() {
            expect(window.test1).toBe(true);
            expect(operations).toEqual([]);
        });
    });

    it('should record custom asynchronous callbacks within defined operation', function() {
        expect(window.test2).not.toBe(true);

        var done;
        var f = Dials.tracked(function someOp() {
            loadScript('base/test-data/test2.js', function onSuccess() {
                done = true;
            });
        });

        var t0 = now();
        f();

        waitsFor(function() {
            return done && window.test2;
        }, 'Should load script');

        runs(function() {
            expect(window.test2).toBe(true);

            expect(operations).toNearlyEqual([{
                t0: t0,
                name: 'someOp',
                queued: 0,
                started: 0,
                duration: 0,
                totalDuration: '*',
                success: true,
                calls: [{
                    name: 'onSuccess',
                    queued : 0,
                    started : '*',
                    duration : 0,
                    success : true
                }],
            }]);
        });
    });
});
