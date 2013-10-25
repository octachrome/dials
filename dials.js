'use strict';

(function(env) {
    var onComplete = null;
    var current = null;

    function now() {
        return new Date().getTime();
    }

    function invoke(thisArg, fn, cur, leg, args) {
        var prev = current;
        current = cur;

        var start = now();
        leg.started = start - cur[0].t0;

        var result, error;
        try {
            result = fn.apply(thisArg, args);
        } catch (e) {
            error = e;
        }

        var end = now();
        current = prev;

        leg.duration = end - start;
        checkDone(cur);

        if (error) {
            leg.success = false;
            throw error;
        } else {
            leg.success = true;
            return result;
        }
    }

    function checkDone(cur) {
        try {
            if (isOpComplete(cur)) {
                onComplete && onComplete(cur);
            }
        } catch (e) {
            // ignore errors thrown by onComplete
        }
    }

    function isOpComplete(cur) {
        for (var i = 0; i < cur.length; i++) {
            if (cur[i].duration == null) {
                return false;
            }
        }
        return true;
    }

    var plainTimeout = env.setTimeout;
    env.setTimeout = function Dials_setTimeout(fn, timeout) {
        if (current) {
            var leg = {
                name: fn.name,
                queued: now() - current[0].t0
            };
            current.push(leg);
            var cur = current;

            var args = Array.prototype.slice.call(arguments, 2);
            plainTimeout(function() {
                return invoke(this, fn, cur, leg, args);
            }, timeout);
        } else {
            plainTimeout.apply(this, arguments);
        }
    };

    env.Dials = {
        onComplete: function(fn) {
            onComplete = fn;
        },

        track: function(fn) {
            return function() {
                var result, error;

                var leg = {
                    t0: now(),
                    name: fn.name,
                    queued: 0
                };

                return invoke(this, fn, [leg], leg, arguments);
            }
        },

        ignore: function(fn) {
            var cur = current;
            current = null;
            fn();
            current = cur;
        }
    };
}(this));
