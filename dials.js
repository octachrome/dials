'use strict';

(function(env) {
    /**
     * The listener function to call when an operation completes. Should add support for several listeners at some
     * point.
     */
    var onComplete = null;

    /**
     * The current operation. This is a state variable which is set whenever an operation becomes active, so that any
     * asynchronous calls which are queued will be linked to the active operation. The variable gets updated whenever
     * any function associated with an operation begins or ends.
     */
    var current = null;

    /**
     * Returns the current time, as millis since 1970-01-01.
     * @return the current time
     */
    function now() {
        return new Date().getTime();
    }

    /**
     * Invokes an asynchronous callback which should be considered a continuation of a previously started operation.
     * The state of the previous operation will be restored, so that other asynchronous operations will also be
     * detected, and timing data will be recorded when the callback starts/finishes.
     * @param thisArg   the context for the operation
     * @param fn        the callback to invoke
     * @param cur       the operation which the callback is part of
     * @param leg       the leg of the operation associated with this callback invocation
     * @param args      the arguments which should be passed to the callback
     * @return the return value of the callback; if the callback throws an exception, this method will re-throw it
     */
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

    /**
     * Check whether the current operation is complete, and if so fires the onComplete listener.
     * @return true if the current operation is complete
     */
    function checkDone(cur) {
        try {
            if (isOpComplete(cur)) {
                onComplete && onComplete(cur);
            }
        } catch (e) {
            // ignore errors thrown by onComplete
        }
    }

    /**
     * Returns true if the current operation is complete, i.e., every leg has a non-null duration.
     * @return true if the current operation is complete
     */
    function isOpComplete(cur) {
        for (var i = 0; i < cur.length; i++) {
            if (cur[i].duration == null) {
                return false;
            }
        }
        return true;
    }

    /**
     * Queue an asynchronous function call which should be linked to the current operation. The given function will
     * be invoked immediately with a single argument: a function which should be used to decorate any callbacks that
     * should be tracked as part of the current operation.
     */
    function wrapCallbacks(fn) {
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

        return fn(wrap);
    }

    var plainTimeout = env.setTimeout;
    env.setTimeout = function Dials_setTimeout() {
        var args = Array.prototype.slice.call(arguments, 0);
        return wrapCallbacks(function(wrap) {
            // 1st argument is the callback function
            args[0] = wrap(args[0]);
            return plainTimeout.apply(null, args);
        });
    };

    if (typeof Ajax == 'object' && Ajax.Request) {
        var plainInitialize = Ajax.Request.prototype.initialize;
        Ajax.Request.prototype.initialize = function Dials_Ajax_Request_initialize(url, options) {
            var thisObj = this;
            return wrapCallbacks(function(wrap) {
                if (options.onSuccess) {
                    options.onSuccess = wrap(options.onSuccess);
                }
                if (options.onFailure) {
                    options.onFailure = wrap(options.onFailure);
                }
                return plainInitialize.call(thisObj, url, options);
            });
        };
    }

    env.Dials = {
        /**
         * Register a listener function which should be fired whenever an operation completes.
         * @param fn a listener function
         */
        onComplete: function(fn) {
            onComplete = fn;
        },

        /**
         * Decorate a function so that it begins a new operation. The decorator preserves 'this' so can be safely used
         * to decorate methods.
         * @param fn the function to decorate
         * @return a decorated function
         */
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

        /**
         * Invoke the given function and ignore any asynchronous calls queued by it (they will not be tracked as part
         * of the current operation).
         * @param fn the function to invoke
         */
        ignore: function(fn) {
            var cur = current;
            current = null;
            fn();
            current = cur;
        }
    };
}(this));
