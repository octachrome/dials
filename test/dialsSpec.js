"use strict";

describe("Dials", function() {
    function now() {
        return new Date().getTime();
    }

    function work(delay) {
        var start = now();
        while (now() - start < delay);
    }

    beforeEach(function () {
        this.addMatchers({
            toBeBetween: function toBeBetween(lower, upper) {
                return this.actual >= lower && this.actual <= upper;
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

        expect(operation).toEqual([{
            t0: t0,
            name: 'add',
            queued: 0,
            started: 0,
            duration: 0
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

        expect(error).not.toEqual(null);

        expect(operation).toEqual([{
            t0: t0,
            name: 'throwError',
            queued: 0,
            started: 0,
            duration: 0
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

            expect(operation).toEqual([{
                t0: t0,
                queued: 0,
                started: 0,
                name: 'thing1',
                duration: 0
            }, {
                queued: 0,
                name: 'thing2',
                duration: 0
            }]);
        });
    });
});

// ignore()
// timing
// timeout arguments
// timeout not within op
// overlapping ops
// status of calls (success or fail)
