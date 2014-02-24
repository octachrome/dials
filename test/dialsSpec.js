/*
   Copyright 2013 Christopher Brown

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/
'use strict';

describe('Dials', function() {
    var operations;

    beforeEach(function () {
        operations = [];

        Dials.onComplete(function(op) {
            operations.push(op);
        });

        this.addMatchers({
            toBeAtLeast: function(expected) {
                if (isIE()) {
                    // O IE how we love you
                    expected = expected > 5 ? expected - 5 : 0;
                }
                return this.actual >= expected;
            },

            /**
             * An equality test which is ignored for IE browsers (IE does not support the Function.name property),
             */
            toBeUnlessIE: function(expected) {
                return this.actual == expected || isIE();
            }
        });

        installMatchers(this);
    });

    it('should record a simple function call', function() {
        var f = Dials.tracked(function add(a, b) {
            return a + b;
        });

        expect(operations).toEqual([]);

        var t0 = now();
        var result = f(2, 3);

        expect(result).toBe(5);

        expect(operations).toFit([{
            name: this.expect.toBeUnlessIE('add'),
            t0: this.expect.toBeAtLeast(t0),
            queued: this.expect.toBeAtLeast(0),
            started: this.expect.toBeAtLeast(0),
            duration: this.expect.toBeAtLeast(0),
            totalDuration: this.expect.toBeAtLeast(0),
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

        expect(operations).toFit([{
            name: this.expect.toBeUnlessIE('throwError'),
            t0: this.expect.toBeAtLeast(t0),
            queued: this.expect.toBeAtLeast(0),
            started: this.expect.toBeAtLeast(0),
            duration: this.expect.toBeAtLeast(0),
            totalDuration: this.expect.toBeAtLeast(0),
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

            expect(operations).toFit([{
                name: this.expect.toBeUnlessIE('thing1'),
                t0: this.expect.toBeAtLeast(t0),
                queued: this.expect.toBeAtLeast(0),
                started: this.expect.toBeAtLeast(0),
                duration: this.expect.toBeAtLeast(25),
                totalDuration: this.expect.toBeAtLeast(35),
                success: true,
                calls: [{
                    cause: 'timeout',
                    name: this.expect.toBeUnlessIE('thing2'),
                    queued: this.expect.toBeAtLeast(20),
                    started: this.expect.toBeAtLeast(30),
                    duration: this.expect.toBeAtLeast(5),
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
            expect(operations).toFit([{
                name: this.expect.toBeUnlessIE('thing2'),
                t0: this.expect.toBeAtLeast(t0),
                queued: this.expect.toBeAtLeast(0),
                started: this.expect.toBeAtLeast(0),
                duration: this.expect.toBeAtLeast(0),
                totalDuration: this.expect.toBeAtLeast(9),
                success: true,
                calls: [{
                    cause: 'timeout',
                    name: this.expect.toBeUnlessIE('thing2a'),
                    queued: this.expect.toBeAtLeast(0),
                    started: this.expect.toBeAtLeast(9),
                    duration: this.expect.toBeAtLeast(0),
                    success: true
                }]
            },{
                name: this.expect.toBeUnlessIE('thing1'),
                t0: this.expect.toBeAtLeast(t0),
                queued: this.expect.toBeAtLeast(0),
                started: this.expect.toBeAtLeast(0),
                duration: this.expect.toBeAtLeast(0),
                totalDuration: this.expect.toBeAtLeast(30),
                success: true,
                calls: [{
                    cause: 'timeout',
                    name: this.expect.toBeUnlessIE('thing1a'),
                    queued: this.expect.toBeAtLeast(0),
                    started: this.expect.toBeAtLeast(30),
                    duration: this.expect.toBeAtLeast(0),
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

        expect(operations).toFit([{
            name: this.expect.toBeUnlessIE('outer'),
            t0: this.expect.toBeAtLeast(t0),
            queued: this.expect.toBeAtLeast(0),
            started: this.expect.toBeAtLeast(0),
            duration: this.expect.toBeAtLeast(0),
            totalDuration: this.expect.toBeAtLeast(0),
            success: true
        }]);

        waitsFor(function() {
            return wasCalled;
        }, '<inner> should be called', 100);

        runs(function() {
            // No change
            expect(operations).toFit([{
                name: this.expect.toBeUnlessIE('outer'),
                t0: this.expect.toBeAtLeast(t0),
                queued: this.expect.toBeAtLeast(0),
                started: this.expect.toBeAtLeast(0),
                duration: this.expect.toBeAtLeast(0),
                totalDuration: this.expect.toBeAtLeast(0),
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

            expect(operations).toFit([{
                name: this.expect.toBeUnlessIE('outer'),
                t0: this.expect.toBeAtLeast(t0),
                queued: this.expect.toBeAtLeast(0),
                started: this.expect.toBeAtLeast(0),
                duration: this.expect.toBeAtLeast(0),
                totalDuration: this.expect.toBeAtLeast(0),
                success: true,
                calls: [{
                    cause: 'timeout',
                    name: this.expect.toBeUnlessIE('inner2'),
                    queued: this.expect.toBeAtLeast(0),
                    started: this.expect.toBeAtLeast(0),
                    duration: this.expect.toBeAtLeast(0),
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
            onSuccess = Dials.wrap(onSuccess);
            onSuccess(x);
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
            onSuccess = Dials.wrap(onSuccess);
            onSuccess(x);
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
        expect(operations).toFit([{
            name: this.expect.toBeUnlessIE('op'),
            t0: this.expect.toBeAtLeast(t0),
            queued: this.expect.toBeAtLeast(0),
            started: this.expect.toBeAtLeast(0),
            duration: this.expect.toBeAtLeast(0),
            totalDuration: this.expect.toBeAtLeast(0),
            success: true,
            calls: [{
                name: this.expect.toBeUnlessIE('onSuccess'),
                queued: this.expect.toBeAtLeast(0),
                started: this.expect.toBeAtLeast(0),
                duration: this.expect.toBeAtLeast(0),
                success: true
            }]
        }]);
    });

    it('should record custom synchronous callbacks which throw', function() {
        function asyncCall(x, onSuccess) {
            onSuccess = Dials.wrap(onSuccess);
            onSuccess(x);
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

        expect(operations).toFit([{
            name: this.expect.toBeUnlessIE('op'),
            t0: this.expect.toBeAtLeast(t0),
            queued: this.expect.toBeAtLeast(0),
            started: this.expect.toBeAtLeast(0),
            duration: this.expect.toBeAtLeast(0),
            totalDuration: this.expect.toBeAtLeast(0),
            success: true,
            calls: [{
                name: this.expect.toBeUnlessIE('onSuccess'),
                queued: this.expect.toBeAtLeast(0),
                started: this.expect.toBeAtLeast(0),
                duration: this.expect.toBeAtLeast(0),
                success: false
            }]
        }]);
    });

    it('should pass through the return values of callbacks', function() {
        function asyncCall(x, onSuccess) {
            onSuccess = Dials.wrap(onSuccess);
            return onSuccess(x);
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

        expect(operations).toFit([{
            name: this.expect.toBeUnlessIE('my operation'),
            t0: this.expect.toBeAtLeast(t0),
            queued: this.expect.toBeAtLeast(0),
            started: this.expect.toBeAtLeast(0),
            duration: this.expect.toBeAtLeast(0),
            totalDuration: this.expect.toBeAtLeast(0),
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

        expect(operations).toFit([{
            name: this.expect.toBeUnlessIE('thing1'),
            t0: this.expect.toBeAtLeast(t0),
            queued: this.expect.toBeAtLeast(0),
            started: this.expect.toBeAtLeast(0),
            duration: this.expect.toBeAtLeast(0),
            totalDuration: this.expect.toBeAtLeast(0),
            success: true,
            calls: []
        }]);
    });

    it('should be able to cancel untracked timeouts', function() {
        var timedOut = false;

        var timeoutId = setTimeout(function timeout() {
            timedOut = true;
        }, 1);

        clearTimeout(timeoutId);

        waits(50);

        runs(function() {
            expect(timedOut).toBeFalsy();
        });
    });
});
