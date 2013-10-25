'use strict';

(function(env) {
    var onComplete = null;
    var current = null;

    function now() {
        return new Date().getTime();
    }

    function invoke(fn, leg, args) {
        var result, error, start, end;

        try {
            start = now();
            leg.started = start - current[0].t0;
            result = fn.apply(null, args);
        } catch (e) {
            error = e;
        }
        end = now();

        leg.duration = end - start;
        checkDone();

        if (error) {
            leg.success = false;
            throw error;
        } else {
            leg.success = true;
            return result;
        }
    }

    function checkDone() {
        try {
            if (isOpComplete()) {
                onComplete && onComplete(current);
            }
        } catch (e) {
            // ignore errors thrown by onComplete
        }
    }

    function isOpComplete() {
        for (var i = 0; i < current.length; i++) {
            if (current[i].duration == null) {
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

            plainTimeout(function() {
                return invoke(fn, leg);
            }, timeout);
        }
    };

    env.Dials = {
        onComplete: function(fn) {
            onComplete = fn;
        },

        define: function(fn) {
            return function() {
                var result, error;

                var leg = {
                    t0: now(),
                    name: fn.name,
                    queued: 0,
                    started: 0
                };
                current = [leg];

                return invoke(fn, leg, arguments);
            }
        }
    };
}(this));
