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
        var t0;

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

        runs(function() {
            expect(operation).toBe(null);

            t0 = now();
            f();

            expect(gotCalled).toBe(false);
            expect(operation).toBe(null);
        });

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
});

// ignore()
// timeout arguments
// timeout not within op
// overlapping ops
