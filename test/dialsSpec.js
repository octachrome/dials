'use strict';

describe('Dials', function() {
    var operations;

    beforeEach(function () {
        operations = [];

        Dials.onComplete(function(op) {
            operations.push(op);
        });

        this.addMatchers({
            toNearlyEqual: function(o) {
                // 5 is good enough for Chrome; Firefox is sometimes 20ms off
                return nearlyEquals.call(this, this.actual, o, 5);
            }
        });
    });

    it('should record a simple function call', function() {
        var f = Dials.tracked(function add(a, b) {
            return a + b;
        });

        expect(operations).toEqual([]);

        var t0 = now();
        var result = f(2, 3);

        expect(result).toBe(5);

        expect(operations).toNearlyEqual([{
            t0: t0,
            name: 'add',
            queued: 0,
            started: 0,
            duration: 0,
            totalDuration: 0,
            success: true
        }]);
    });

    it('should record a throwing function call', function() {
        var f = Dials.tracked(function throwError() {
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

        expect(operations).toNearlyEqual([{
            t0: t0,
            name: 'throwError',
            queued: 0,
            started: 0,
            duration: 0,
            totalDuration: 0,
            success: false
        }]);
    });

    it('should record a function call which sets a timeout', function() {
        var timeoutValue = null;
        var timeoutId = null;

        var f = Dials.tracked(function thing1() {
            work(20);

            timeoutId = setTimeout(function thing2(value) {
                work(5);
                timeoutValue = value;
            }, 10, 'test');

            work(5);
        });

        expect(operations).toEqual([]);

        var t0 = now();
        f();

        expect(timeoutId).not.toEqual(null);
        expect(timeoutValue).toBe(null);
        expect(operations).toEqual([]);

        waitsFor(function() {
            return operations.length;
        }, 'operation should complete', 100);

        runs(function() {
            if (!isIE()) expect(timeoutValue).toBe('test');

            expect(operations).toNearlyEqual([{
                t0: t0,
                queued: 0,
                started: 0,
                name: 'thing1',
                duration: 25,
                totalDuration: 35,
                success: true,
                calls: [{
                    cause: 'timeout',
                    queued: 20,
                    started: 30,
                    name: 'thing2',
                    duration: 5,
                    success: true
                }]
            }]);
        });
    });

    // it should record a function call which sets a timeout which throws, but Jasmine doesn't like that

    it('should record overlapping operations separately', function() {
        var f1 = Dials.tracked(function thing1() {
            setTimeout(function thing1a() {
            }, 30);
        });

        var f2 = Dials.tracked(function thing2() {
            setTimeout(function thing2a() {
            }, 10);
        });

        var t0 = now();
        f1();
        f2();

        expect(operations).toEqual([]);

        waitsFor(function() {
            return operations.length == 2;
        }, 'two operations should complete', 100);

        runs(function() {
            // thing2 finishes first, because it has a shorter timeout
            expect(operations).toNearlyEqual([{
                t0: t0,
                queued: 0,
                started: 0,
                name: 'thing2',
                duration: 0,
                totalDuration: 10,
                success: true,
                calls: [{
                    cause: 'timeout',
                    queued: 0,
                    started: 10,
                    name: 'thing2a',
                    duration: 0,
                    success: true
                }]
            },{
                t0: t0,
                queued: 0,
                started: 0,
                name: 'thing1',
                duration: 0,
                totalDuration: 30,
                success: true,
                calls: [{
                    cause: 'timeout',
                    queued: 0,
                    started: 30,
                    name: 'thing1a',
                    duration: 0,
                    success: true
                }]
            }]);
        });
    });

    it('should ignore ignored calls to setTimeout', function() {
        var wasCalled = false;

        var f = Dials.tracked(function outer() {
            Dials.ignore(function ignored() {
                setTimeout(function inner() {
                    wasCalled = true;
                }, 1);
            });
        });

        var t0 = now();
        f();

        expect(operations).toNearlyEqual([{
            t0: t0,
            name: 'outer',
            queued: 0,
            started: 0,
            duration: 0,
            totalDuration: 0,
            success: true
        }]);

        waitsFor(function() {
            return wasCalled;
        }, '<inner> should be called', 100);

        runs(function() {
            // No change
            expect(operations).toNearlyEqual([{
                t0: t0,
                name: 'outer',
                queued: 0,
                started: 0,
                duration: 0,
                totalDuration: 0,
                success: true
            }]);
        });
    });

    it('should not ignore calls to setTimeout which follow after ignored calls', function() {
        var stuff = [];

        var f = Dials.tracked(function outer() {
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
        }, 'operation should complete', 100);

        runs(function() {
            expect(stuff).toEqual(['a', 'b']);

            expect(operations).toNearlyEqual([{
                t0: t0,
                name: 'outer',
                queued: 0,
                started: 0,
                duration: 0,
                totalDuration: 10,
                success: true,
                calls: [{
                    cause: 'timeout',
                    name: 'inner2',
                    queued: 0,
                    started: 10,
                    duration: 0,
                    success: true
                }]
            }]);
        });
    });

    it('should not interfere with timeouts outside an operation', function() {
        var timedOut;
        var timeoutValue = null;
        
        setTimeout(function(arg) {
            timedOut = true;
            timeoutValue = arg;
        }, 1, 'arg');

        waitsFor(function() {
            return timedOut;
        }, 'timeout should be called', 100);

        runs(function() {
            if (!isIE()) expect(timeoutValue).toEqual('arg');
            expect(operations).toEqual([]);
        });
    });

    it('should preserve the <this> pointer', function() {
        var obj = {
            f: Dials.tracked(function(x) {
                this.x = x;
            })
        };

        obj.f(55);

        expect(obj.x).toBe(55);
    });

    it('should ignore custom synchronous callbacks outside a defined operation', function() {
        function asyncCall(x, onSuccess) {
            Dials.fork(function(wrap) {
                onSuccess = wrap(onSuccess);
                onSuccess(x);
            });
        }

        var result;
        asyncCall(5, function onSuccess(x) {
            result = x;
        });

        expect(result).toBe(5);
        expect(operations).toEqual([]);
    });

    it('should record custom synchronous callbacks within a defined operation', function() {
        function asyncCall(x, onSuccess) {
            Dials.fork(function(wrap) {
                onSuccess = wrap(onSuccess);
                onSuccess(x);
            });
        }

        var result;
        var f = Dials.tracked(function op() {
            asyncCall(6, function onSuccess(x) {
                result = x;
            });
        });

        var t0 = now();
        f();

        expect(result).toBe(6);
        expect(operations).toNearlyEqual([{
            t0: t0,
            name: 'op',
            queued: 0,
            started: 0,
            duration: 0,
            totalDuration: 0,
            success: true,
            calls: [{
                name: 'onSuccess',
                queued: 0,
                started: 0,
                duration: 0,
                success: true
            }],
        }]);
    });

    it('should record custom synchronous callbacks which throw', function() {
        function asyncCall(x, onSuccess) {
            Dials.fork(function(wrap) {
                onSuccess = wrap(onSuccess);
                onSuccess(x);
            });
        }

        var result;
        var f = Dials.tracked(function op() {
            try {
                asyncCall(6, function onSuccess() {
                    throw new Error('boing');
                });
            } catch(e) {
                // ignore
            }
        });

        var t0 = now();
        f();

        expect(operations).toNearlyEqual([{
            t0: t0,
            name: 'op',
            queued: 0,
            started: 0,
            duration: 0,
            totalDuration: 0,
            success: true,
            calls: [{
                name: 'onSuccess',
                queued: 0,
                started: 0,
                duration: 0,
                success: false
            }],
        }]);
    });

    it('should pass through the return values of callbacks', function() {
        function asyncCall(x, onSuccess) {
            return Dials.fork(function(wrap) {
                onSuccess = wrap(onSuccess);
                return onSuccess(x);
            });
        }

        var result;
        var f = Dials.tracked(function op(x) {
            return asyncCall(x, function onSuccess() {
                return x * 5;
            });
        });

        var t0 = now();
        var result = f(3);

        expect(result).toBe(15);
    });

    it('should get the current operation', function() {
        var f = Dials.tracked(function func() {
            return Dials.name();
        });

        var t0 = now();
        var name = f();

        if (!isIE()) expect(name).toEqual('func');
    });

    it('should rename the current operation', function() {
        var f = Dials.tracked(function func() {
            Dials.name('my operation');
        });

        var t0 = now();
        f();

        expect(operations).toNearlyEqual([{
            t0: t0,
            name: 'my operation',
            queued: 0,
            started: 0,
            duration: 0,
            totalDuration: 0,
            success: true
        }]);
    });

    it('should not wait for a cancelled timeout', function() {
        var timeoutId = null;

        var f = Dials.tracked(function thing1() {
            timeoutId = setTimeout(function thing2() {
                expect(true).toBe(false); // fail
            }, 10);

            clearTimeout(timeoutId);
        });

        var t0 = now();
        f();

        expect(timeoutId).not.toEqual(null);

        expect(operations).toNearlyEqual([{
            t0: t0,
            queued: 0,
            started: 0,
            name: 'thing1',
            duration: 0,
            totalDuration: 0,
            success: true,
            calls: []
        }]);
    });
});
