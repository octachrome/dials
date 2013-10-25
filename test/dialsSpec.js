'use strict';

describe('Dials', function() {
    function now() {
        return new Date().getTime();
    }

    function work(delay) {
        var start = now();
        while (now() - start < delay);
    }

    var operations;

    beforeEach(function () {
        operations = [];

        Dials.onComplete(function(op) {
            operations.push(op);
        });

        this.addMatchers({
            toNearlyEqual: function(o) {
                return nearlyEquals.call(this, this.actual, o, 5);
            }
        });
    });

    it('should record a simple function call', function() {
        var f = Dials.define(function add(a, b) {
            return a + b;
        });

        expect(operations).toEqual([]);

        var t0 = now();
        var result = f(2, 3);

        expect(result).toBe(5);

        expect(operations).toNearlyEqual([[{
            t0: t0,
            name: 'add',
            queued: 0,
            started: 0,
            duration: 0,
            success: true
        }]]);
    });

    it('should record a throwing function call', function() {
        var f = Dials.define(function throwError() {
            throw Error('test');
        });

        expect(operations).toEqual([]);

        var error = null;
        try {
            var t0 = now();
            f();
        } catch (e) {
            error = e;
        }

        expect(error).not.toBe(null);

        expect(operations).toNearlyEqual([[{
            t0: t0,
            name: 'throwError',
            queued: 0,
            started: 0,
            duration: 0,
            success: false
        }]]);
    });

    it('should record a function call which sets a timeout', function() {
        var gotCalled = false;

        var f = Dials.define(function thing1() {
            work(20);

            setTimeout(function thing2() {
                work(5);
                gotCalled = true;
            }, 10);

            work(5);
        });

        expect(operations).toEqual([]);

        var t0 = now();
        f();

        expect(gotCalled).toBe(false);
        expect(operations).toEqual([]);

        waitsFor(function() {
            return operations.length;
        }, 'Operation should complete', 100);

        runs(function() {
            expect(gotCalled).toBe(true);

            expect(operations).toNearlyEqual([[{
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
            }]]);
        });
    });

    it('should record overlapping operations separately', function() {
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

    it('should ignore ignored calls to setTimeout', function() {
        var wasCalled = false;

        var f = Dials.define(function outer() {
            Dials.ignore(function ignored() {
                setTimeout(function inner() {
                    wasCalled = true;
                }, 1);
            });
        });

        var t0 = now();
        f();

        expect(operations).toNearlyEqual([[{
            t0: t0,
            name: 'outer',
            queued: 0,
            started: 0,
            duration: 0,
            success: true
        }]]);

        waitsFor(function() {
            return wasCalled;
        }, '<inner> should be called', 100);

        runs(function() {
            // No change
            expect(operations).toNearlyEqual([[{
                t0: t0,
                name: 'outer',
                queued: 0,
                started: 0,
                duration: 0,
                success: true
            }]]);
        });
    });

    it('should not ignore calls to setTimeout which follow after ignored calls', function() {
        var stuff = [];

        var f = Dials.define(function outer() {
            Dials.ignore(function ignored() {
                setTimeout(function inner1() {
                    stuff.push('a');
                }, 1)
            });
            setTimeout(function inner2() {
                stuff.push('b');
            }, 10)
        });

        var t0 = now();
        f();

        expect(operations).toEqual([]);

        waitsFor(function() {
            return operations.length;
        });

        runs(function() {
            expect(stuff).toEqual(['a', 'b']);

            expect(operations).toNearlyEqual([[{
                t0: t0,
                name: 'outer',
                queued: 0,
                started: 0,
                duration: 0,
                success: true
            }, {
                name: 'inner2',
                queued: 0,
                started: 10,
                duration: 0,
                success: true
            }]]);
        });
    });

    it('should not interfere with timeouts outside an operation', function() {
        var wasCalled = false;
        
        setTimeout(function() {
            wasCalled = true;
        }, 1);

        waitsFor(function() {
            return wasCalled;
        });

        runs(function() {
            expect(operations).toEqual([]);
        });
    });
});

// timeout arguments
