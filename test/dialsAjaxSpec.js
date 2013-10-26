'use strict';

describe('Dials-Ajax', function() {
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

    it('should not record Ajax.Requests outside of tracked functions', function() {
        var json;

        new Ajax.Request('https://api.github.com/users/octachrome', {method: 'get', onSuccess: function(transport) {
            json = transport.responseJSON;
        }});

        waitsFor(function() {
            return json;
        });

        runs(function() {
            expect(json.login).toBe('octachrome');
            expect(operations).toEqual([]);
        })
    });

    it('should record Ajax.Requests within tracked functions', function() {
        var json;

        var f = Dials.tracked(function thing1() {
            new Ajax.Request('https://api.github.com/users/octachrome', {
                method: 'get',
                onSuccess: function thing2(transport) {
                    json = transport.responseJSON;
                }
            });
        });

        var t0 = now();
        f();

        waitsFor(function() {
            return json;
        });

        runs(function() {
            expect(json.login).toBe('octachrome');

            expect(operations).toNearlyEqual([[{
                t0: t0,
                name: 'thing1',
                queued: 0,
                started: 0,
                duration: 0,
                success: true
            },
            {
                name: 'thing2',
                queued: 0,
                started: '*',   // takes anywhere between 5ms and 300ms to complete the request
                duration: 0,
                success: true
            },
            {
                name: '',       // a timeout set by prototype.js internally
                queued: 0,
                started: 10,
                duration: 0,
                success: true
            }]]);
        })
    });
});
