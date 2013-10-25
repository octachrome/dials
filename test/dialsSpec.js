'use strict';

describe('Dials', function() {
    function now() {
        return new Date().getTime();
    }

    function work(delay) {
        var start = now();
        while (now() - start < delay);
    }

    beforeEach(function () {
        /**
         * Given a complex object containing operations, round all the timestamp fields to the <nearest> millis.
         */
        function round(o, nearest) {
            var ret;
            if (Array.isArray(o)) {
                ret = [];
                for (var i = 0; i < o.length; i++) {
                    ret[i] = round(o[i], nearest);
                }
                return ret;
            } else if (typeof o == 'object') {
                ret = {};
                for (var key in o) {
                    if (key == 't0' || key == 'queued' || key == 'started' || key == 'duration') {
                        ret[key] = nearest * Math.round(o[key] / nearest);
                    } else {
                        ret[key] = round(o[key], nearest);
                    }
                }
                return ret;
            } else {
                return o;
            }
        }

        this.addMatchers({
            toNearlyEqual: function(expected) {
                return this.env.equals_(round(this.actual, 5), round(expected, 5));
            }
        });
    });

    it('should record a simple function call', function() {
        var operation = null;

        Dials.onComplete(function(o) {
            operation = o;
        });

        var f = Dials.define(function add(a, b) {
            return a + b;
        });

        expect(operation).toBe(null);

        var t0 = now();
        var result = f(2, 3);

        expect(result).toBe(5);

        expect(operation).toNearlyEqual([{
            t0: t0,
            name: 'add',
            queued: 0,
            started: 0,
            duration: 0,
            success: true
        }]);
    });

    it('should record a throwing function call', function() {
        var operation = null;

        Dials.onComplete(function(o) {
            operation = o;
        });

        var f = Dials.define(function throwError() {
            throw Error('test');
        });

        expect(operation).toBe(null);

        var error = null;
        try {
            var t0 = now();
            f();
        } catch (e) {
            error = e;
        }

        expect(error).not.toBe(null);

        expect(operation).toNearlyEqual([{
            t0: t0,
            name: 'throwError',
            queued: 0,
            started: 0,
            duration: 0,
            success: false
        }]);
    });

    it('should record a function call which sets a timeout', function() {
        var operation = null;
        var gotCalled = false;

        Dials.onComplete(function(o) {
            operation = o;
        });

        var f = Dials.define(function thing1() {
            work(20);

            setTimeout(function thing2() {
                work(5);
                gotCalled = true;
            }, 10);

            work(5);
        });

        expect(operation).toBe(null);

        var t0 = now();
        f();

        expect(gotCalled).toBe(false);
        expect(operation).toBe(null);

        waitsFor(function() {
            return operation != null;
        }, 'Operation should complete', 100);

        runs(function() {
            expect(gotCalled).toBe(true);

            expect(operation).toNearlyEqual([{
                t0: t0,
                queued: 0,
                started: 0,
                name: 'thing1',
                duration: 25,
                success: true
            }, {
                queued: 20,
                started: 30,
                name: 'thing2',
                duration: 5,
                success: true
            }]);
        });
    });

    it('should record overlapping operations separately', function() {
        var operations = [];

        Dials.onComplete(function(op) {
            operations.push(op);
        });

        var f1 = Dials.define(function thing1() {
            setTimeout(function thing1a() {
            }, 30);
        });

        var f2 = Dials.define(function thing2() {
            setTimeout(function thing2a() {
            }, 10);
        });

        var t0 = now();
        f1();
        f2();

        expect(operations).toEqual([]);

        waitsFor(function() {
            return operations.length == 2;
        }, 'Two operations should complete', 100);

        runs(function() {
            // thing2 finishes first, because it has a shorter timeout
            expect(operations[0]).toNearlyEqual([{
                t0: t0,
                queued: 0,
                started: 0,
                name: 'thing2',
                duration: 0,
                success: true
            }, {
                queued: 0,
                started: 10,
                name: 'thing2a',
                duration: 0,
                success: true
            }]);

            expect(operations[1]).toNearlyEqual([{
                t0: t0,
                queued: 0,
                started: 0,
                name: 'thing1',
                duration: 0,
                success: true
            }, {
                queued: 0,
                started: 30,
                name: 'thing1a',
                duration: 0,
                success: true
            }]);
        });
    });
});

// ignore()
// timeout arguments
// timeout not within op
