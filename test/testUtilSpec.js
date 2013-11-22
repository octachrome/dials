'use strict';

describe('nearlyEquals', function() {
    beforeEach(function () {
        this.addMatchers({
            toNearlyEqual: function(o) {
                return nearlyEquals.call(this, this.actual, o, 5);
            }
        });
    });

    it('should compare arrays correctly', function() {
        expect([]).toNearlyEqual([]);
        expect([1]).toNearlyEqual([1]);
        expect([{}]).toNearlyEqual([{}]);
        expect([{k: 1}]).toNearlyEqual([{k: 1}]);
        expect([[]]).toNearlyEqual([[]]);
        expect(['test']).toNearlyEqual(['test']);

        expect([]).not.toNearlyEqual([1]);
        expect([1]).not.toNearlyEqual([]);
        expect([{k: 1}]).not.toNearlyEqual([{k: 1, j: 2}]);
        expect([{k: 1, j: 1}]).not.toNearlyEqual([{k: 1}]);
        expect([{k: 5}]).not.toNearlyEqual([{k: 6}]);
        expect([[]]).not.toNearlyEqual([]);
        expect([]).not.toNearlyEqual([[]]);
        expect([5]).not.toNearlyEqual(['test']);
    });

    it('should compare timestamp fields with delta', function() {
        expect([{t0: 5}]).toNearlyEqual([{t0: 5}]);
        expect([{t0: 5}]).toNearlyEqual([{t0: 10}]);
        expect([{t0: 10}]).toNearlyEqual([{t0: 5}]);
        expect([{t0: 5}]).not.toNearlyEqual([{t0: 11}]);
        expect([{t0: 11}]).not.toNearlyEqual([{t0: 5}]);
    });

    it('should compare timestamps in nested legs with delta', function() {
        expect(        [ { t0 : 1382822424880, queued : 0, started : 0, name : 'thing1', totalDuration : 26, success : true, calls : [ { queued : 21, started : 31, name : 'thing2', duration : 6, success : true } ] } ])
        .toNearlyEqual([ { t0 : 1382822424880, queued : 0, started : 0, name : 'thing1', totalDuration : 25, success : true, calls : [ { queued : 20, started : 30, name : 'thing2', duration : 5, success : true } ] } ]);
    });
});

describe('deepCopy', function() {
    it('should copy a number', function() {
        expect(deepCopy(5)).toBe(5);
    });

    it('should copy a string', function() {
        expect(deepCopy("test")).toBe("test");
    });

    it('should copy null', function() {
        expect(deepCopy(null)).toBe(null);
    });

    it('should copy an array', function() {
        var a = [1, 2, 3];
        var copy = deepCopy(a);

        expect(copy).toEqual(a);
        expect(copy).not.toBe(a);
    });

    it('should copy an object', function() {
        var o = {'x': 5};
        var copy = deepCopy(o);

        expect(copy).toEqual(o);
        expect(copy).not.toBe(o);
    });

    it('should copy a complex object', function() {
        var o = {
            'a': [
                {
                    'b': [4]
                }
            ],
            'c': {
                'd': 5
            }
        };
        var copy = deepCopy(o);

        expect(copy).toEqual(o);

        expect(copy).not.toBe(o);
        expect(copy.a).not.toBe(o.a);
        expect(copy.a[0]).not.toBe(o.a[0]);
        expect(copy.a[0].b).not.toBe(o.a[0].b);
        expect(copy.c).not.toBe(o.c);
    });
});
