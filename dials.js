"use strict";

(function(env) {
    var onComplete = null;
    var current = null;

    function invoke(fn, leg, args) {
        var result, error;

        try {
            result = fn.apply(null, args);
        } catch (e) {
            error = e;
        }

        leg.duration = 0;
        checkDone();

        if (error) {
            throw error;
        } else {
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
                queued: 0,
                name: fn.name
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
                    start: 0,
                    name: fn.name
                };
                current = [leg];

                return invoke(fn, leg, arguments);
            }
        }
    };
}(this));
