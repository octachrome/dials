"use strict";

describe("Dials", function() {
    function work(delay) {
        var time = new Date().getTime();
        while (new Date().getTime() - time < delay);
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

        var result = f(2, 3);

        expect(result).toBe(5);

        expect(operation).toEqual([{
            name: 'add',
            start: 0,
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
            f();
        } catch (e) {
            error = e;
        }

        expect(error).not.toEqual(null);

        expect(operation).toEqual([{
            name: 'throwError',
            start: 0,
            duration: 0
        }]);
    });

    it('should record a function call which sets a timeout', function() {
        var operation = null;
        var gotCalled = false;

        Dials.onComplete(function(o) {
            operation = o;
        });

        runs(function() {
            var f = Dials.define(function thing1() {
                work(20);

                setTimeout(function thing2() {
                    work(5);
                    gotCalled = true;
                }, 10);
            });

            expect(operation).toBe(null);

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
                start: 0,
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
// timeout arguments
// timeout not within op
// overlapping ops
// status of calls (success or fail)
