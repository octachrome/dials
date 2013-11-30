'use strict';

describe('nearlyEquals', function() {
    beforeEach(function () {
        this.addMatchers({
            toNearlyEqual: toNearlyEqual
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

    it('should detect missing elements from nested arrays', function() {
        expect([{
            t0: 0,
            name: 'myOp',
            queued: 0,
            started: 0,
            duration: 0,
            totalDuration: '*',
            success: true,
            calls: [{
                cause: 'timeout',
                queued: 0,
                started: '*',
                duration: 0,
                success: true
            }]
        }]).not.toNearlyEqual([{
            t0: 0,
            name: 'myOp',
            queued: 0,
            started: 0,
            duration: 0,
            totalDuration: '*',
            success: true,
            calls: [{
                cause: 'timeout',
                queued: 0,
                started: '*',
                duration: 0,
                success: true
            },{
                cause: 'ajax:base/missing.json',
                queued: 0,
                started: '*',
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

describe('deepCopy', function() {
    it('should copy a number', function() {
        expect(deepCopy(5)).toBe(5);
    });

    it('should copy a string', function() {
        expect(deepCopy('test')).toBe('test');
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

describe('isNearlyEqual assertion failure messages', function() {
    function MockValue(actual) {
        this.env = jasmine.getEnv();
        this.actual = actual;
    }

    it('should give correct message for number', function() {
        var mockValue = new MockValue(5);
        var result = toNearlyEqual.call(mockValue, 4);

        expect(result).toBeFalsy();

        expect(mockValue.message()[0]).toBe('5\t\texpected 4');
    });

    it('should give correct message for object', function() {
        var mockValue = new MockValue({ a: 5 });
        var result = toNearlyEqual.call(mockValue, { a: 4 });

        expect(result).toBeFalsy();

        expect(mockValue.message()[0]).toBe('{\n a: 5\t\texpected 4');
    });

    it('should give correct message for array', function() {
        var mockValue = new MockValue([5]);
        var result = toNearlyEqual.call(mockValue, [4]);

        expect(result).toBeFalsy();

        expect(mockValue.message()[0]).toBe('[\n 5\t\texpected 4');
    });

    it('should give correct message for number compared to object', function() {
        var mockValue = new MockValue(5);
        var result = toNearlyEqual.call(mockValue, { a: 5 });

        expect(result).toBeFalsy();

        expect(mockValue.message()[0]).toBe('5\t\texpected <object>');
    });

    it('should give correct message for object compared to number', function() {
        var mockValue = new MockValue({ a : 5 });
        var result = toNearlyEqual.call(mockValue, 5);

        expect(result).toBeFalsy();

        expect(mockValue.message()[0]).toBe('{\t\texpected 5');
    });

    it('should give correct message for object compared to null', function() {
        var mockValue = new MockValue({});
        var result = toNearlyEqual.call(mockValue, null);

        expect(result).toBeFalsy();

        expect(mockValue.message()[0]).toBe('{\t\texpected null');
    });

    it('should give correct message for null compared to object', function() {
        var mockValue = new MockValue(null);
        var result = toNearlyEqual.call(mockValue, {});

        expect(result).toBeFalsy();

        expect(mockValue.message()[0]).toBe('null\t\texpected <object>');
    });

    it('should give correct message for object compared to array', function() {
        var mockValue = new MockValue({ a : 5 });
        var result = toNearlyEqual.call(mockValue, [5]);

        expect(result).toBeFalsy();

        expect(mockValue.message()[0]).toBe('{\t\texpected <array>');
    });

    it('should give correct message for array compared to object', function() {
        var mockValue = new MockValue([5]);
        var result = toNearlyEqual.call(mockValue, { a : 5 });

        expect(result).toBeFalsy();

        expect(mockValue.message()[0]).toBe('[\t\texpected <object>');
    });

    it('should give correct message for array compared to number', function() {
        var mockValue = new MockValue([5]);
        var result = toNearlyEqual.call(mockValue, 5);

        expect(result).toBeFalsy();

        expect(mockValue.message()[0]).toBe('[\t\texpected 5');
    });

    it('should give correct message for number compared to array', function() {
        var mockValue = new MockValue(5);
        var result = toNearlyEqual.call(mockValue, [5]);

        expect(result).toBeFalsy();

        expect(mockValue.message()[0]).toBe('5\t\texpected <array>');
    });

    it('should give correct message for array compared to null', function() {
        var mockValue = new MockValue([]);
        var result = toNearlyEqual.call(mockValue, null);

        expect(result).toBeFalsy();

        expect(mockValue.message()[0]).toBe('[\t\texpected null');
    });

    it('should give correct message for null compared to array', function() {
        var mockValue = new MockValue(null);
        var result = toNearlyEqual.call(mockValue, []);

        expect(result).toBeFalsy();

        expect(mockValue.message()[0]).toBe('null\t\texpected <array>');
    });

    it('should give correct message for number compared to null', function() {
        var mockValue = new MockValue(5);
        var result = toNearlyEqual.call(mockValue, null);

        expect(result).toBeFalsy();

        expect(mockValue.message()[0]).toBe('5\t\texpected null');
    });

    it('should give correct message for null compared to number', function() {
        var mockValue = new MockValue(null);
        var result = toNearlyEqual.call(mockValue, 5);

        expect(result).toBeFalsy();

        expect(mockValue.message()[0]).toBe('null\t\texpected 5');
    });

    it('should give correct message for object containing wrong type of element', function() {
        var mockValue = new MockValue({a: [5]});
        var result = toNearlyEqual.call(mockValue, {a: {b: 5}});

        expect(result).toBeFalsy();

        expect(mockValue.message()[0]).toBe('{\n a: [\t\texpected <object>');
    });

    it('should give correct message for array containing wrong type of element', function() {
        var mockValue = new MockValue([{a: 5}]);
        var result = toNearlyEqual.call(mockValue, [5]);

        expect(result).toBeFalsy();

        expect(mockValue.message()[0]).toBe('[\n {\t\texpected 5');
    });

    it('should give correct message for complex object comparison', function() {
        var mockValue = new MockValue({
            a: [
                {
                    b: [5, 6],
                    c: {
                        d: 'test'
                    }
                }
            ],
            e: null
        });
        var result = toNearlyEqual.call(mockValue, {
            a: [
                {
                    b: [5, 6],
                    c: {
                        d: 'test'
                    }
                }
            ],
            e: 5
        });

        expect(result).toBeFalsy();

        expect(mockValue.message()[0]).toBe(
            '{\n' +
            ' a: [\n' +
            '  {\n' +
            '   b: [\n' +
            '    5,\n' +
            '    6\n' +
            '   ],\n' +
            '   c: {\n' +
            '    d: test\n' +
            '   }\n' + 
            '  }\n' +
            ' ],\n' +
            ' e: null\t\texpected 5');
    });

    it('should give correct message for unexpected object key', function() {
        var mockValue = new MockValue({a: 4});
        var result = toNearlyEqual.call(mockValue, {});

        expect(result).toBeFalsy();

        expect(mockValue.message()[0]).toBe('{\n a: \t\tunexpected key');
    });

    it('should give correct message for missing object key', function() {
        var mockValue = new MockValue({});
        var result = toNearlyEqual.call(mockValue, {a: 4});

        expect(result).toBeFalsy();

        expect(mockValue.message()[0]).toBe('{\n\t\tmissing key: a');
    });

    it('should give correct message for unexpected array element', function() {
        var mockValue = new MockValue([4, 5]);
        var result = toNearlyEqual.call(mockValue, [4]);

        expect(result).toBeFalsy();

        expect(mockValue.message()[0]).toBe('[\n 4,\n 5\t\texpected null');
    });

    it('should give correct message for missing array element', function() {
        var mockValue = new MockValue([4]);
        var result = toNearlyEqual.call(mockValue, [4, 5]);

        expect(result).toBeFalsy();

        expect(mockValue.message()[0]).toBe('[\n 4\n\t\texpected 5 (missing element)');
    });

    it('should give correct message for delta match', function() {
        var mockValue = new MockValue({t0: 123});
        var result = toNearlyEqual.call(mockValue, {t0: 456});

        expect(result).toBeFalsy();

        expect(mockValue.message()[0]).toBe('{\n t0: 123\t\texpected ~456');
    });
});
