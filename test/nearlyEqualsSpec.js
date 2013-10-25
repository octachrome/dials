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
});
