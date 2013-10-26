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
        leg.name = fn.name;

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

    /**
     * Queue an asynchronous function call which should be linked to the current operation.
     */
    function queue(fn) {
        if (current) {
            var leg = {
                queued: now() - current[0].t0
            };
            current.push(leg);
            var cur = current;

            var wrap = function wrap(cb) {
                return function wrapped() {
                    var args = Array.prototype.slice.call(arguments, 0);
                    return invoke(this, cb, cur, leg, args);
                };
            }
        } else {
            wrap = function identity(cb) {
                return cb;
            }
        }

        fn(wrap);
    }

    var plainTimeout = env.setTimeout;
    env.setTimeout = function Dials_setTimeout() {
        var args = Array.prototype.slice.call(arguments, 0);
        queue(function(wrap) {
            // 1st argument is the callback function
            args[0] = wrap(args[0]);
            plainTimeout.apply(null, args);
        });
    };

    if (typeof Ajax == 'object' && Ajax.Request) {
        var plainInitialize = Ajax.Request.prototype.initialize;
        Ajax.Request.prototype.initialize = function Dials_Ajax_Request_initialize(url, options) {
            var thisObj = this;
            queue(function(wrap) {
                if (options.onSuccess) {
                    options.onSuccess = wrap(options.onSuccess);
                }
                plainInitialize.call(thisObj, url, options);
            });
        };
    }

    env.Dials = {
        onComplete: function(fn) {
            onComplete = fn;
        },

        tracked: function(fn) {
            return function() {
                var result, error;

                var leg = {
                    t0: now(),
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
