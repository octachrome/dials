'use strict';

(function(env) {
    /**
     * The listener function to call when an operation completes. Should add support for several listeners at some
     * point.
     */
    var onComplete = null;

    /**
     * All active operations, which have not yet been flagged as complete.
     */
    var activeOps = [];

    /**
     * The current operation. This is a state variable which is set whenever an operation becomes active, so that any
     * asynchronous calls which are queued will be linked to the active operation. The variable gets updated whenever
     * any function associated with an operation begins or ends. It is always set to the root leg of the operation.
     */
    var currentRoot = null;

    /**
     * Similar to currentRoot but holds the active leg of the current operation. Any newly queued asynchronous calls
     * will be recorded as children of this leg.
     */
    var currentLeg = null;

    /**
     * Every leg is assigned an id. This is a map from id to a function which will abort the leg and potentially
     * cause the operation to complete.
     */
    var abortFunctions = {};

    /**
     * The next id which will be allocated to a leg.
     */
    var idCounter = 1;

    /**
     * Returns the current time, as millis since 1970-01-01.
     * @return {number} the current time
     */
    function now() {
        return new Date().getTime();
    }

    /**
     * Creates a unique id, used to identify legs.
     * @return {object} a unique id
     */
    function nextId() {
        return idCounter++;
    }

    /**
     * Invokes an asynchronous callback which should be considered a continuation of a previously started operation.
     * The state of the previous operation will be restored, so that other asynchronous operations will also be
     * detected, and timing data will be recorded when the callback starts/finishes.
     * @param thisArg   the context for the operation
     * @param fn        the callback to invoke
     * @param root      the overall operation which the callback is part of
     * @param leg       the leg of the operation associated with this callback invocation
     * @param args      the arguments which should be passed to the callback
     * @return the return value of the callback; if the callback throws an exception, this method will re-throw it
     */
    function invoke(thisArg, fn, root, leg, args) {
        var prevRoot = currentRoot;
        currentRoot = root;

        var prevLeg = currentLeg;
        currentLeg = leg;

        var start = now();
        leg.started = start - root.t0;
        delete leg.stackTrace;

        var result, error;
        try {
            result = fn.apply(thisArg, args);
        } catch (e) {
            error = e;
        }

        var end = now();
        currentRoot = prevRoot;
        currentLeg = prevLeg;

        leg.duration = end - start;
        root.totalDuration = end - root.t0;

        checkDone(root);

        if (error) {
            leg.success = false;
            throw error;
        } else {
            leg.success = true;
            return result;
        }
    }

    /**
     * Check whether the given operation is complete, and if so fires the onComplete listener.
     */
    function checkDone(op) {
        try {
            var i = activeOps.indexOf(op);
            if (i >= 0 && isLegComplete(op)) {
                activeOps.splice(i, 1);
                onComplete && onComplete(op);
            }
        } catch (e) {
            // ignore errors thrown by onComplete
        }
    }

    /**
     * Returns true if the given leg is complete, i.e., it and its descendants have non-null duration.
     * @return {boolean} true if the current leg is complete
     */
    function isLegComplete(leg) {
        if (leg.duration == null) {
            return false;
        }
        var calls = leg.calls;
        if (calls) {
            for (var i = 0; i < calls.length; i++) {
                if (!isLegComplete(calls[i])) {
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * Queue an asynchronous function call which should be linked to the current operation. The given function will
     * be invoked immediately with a single argument: a function which should be used to decorate any callbacks that
     * should be tracked as part of the current operation.
     */
    function fork(fn) {
        if (currentRoot) {
            var root = currentRoot;
            var parentLeg = currentLeg;

            // The legs for all the sticky callbacks registered with fn
            var stickies = [];

            /**
             * Wraps a callback with the code to re-enter the operation. By default, the first callback that fires
             * completes the operation (unless the callback registers any more async calls). This is because you often
             * have an onSuccess and an onFailure callback, only one of which will fire. If the sticky flag is true,
             * this callback will not complete the operation: it will wait for another callback. This is used on
             * Ajax.Request's onComplete method, to wait for the final onFailure or onSuccess method.
             * @param cb {function} the callback to wrap
             * @param cause {string} a description of what triggered the callback
             * @param sticky {boolean} well, it's a bit complicated
             * @return {function} a wrapped callback
             */
            var wrap = function wrap(cb, cause, sticky) {
                var leg = {
                    queued: now() - root.t0,
                    stackTrace: new Error().stack
                };
                if (cb.name) {
                    leg.name = cb.name;
                }
                if (cause) {
                    leg.cause = cause;
                }
                parentLeg.calls = parentLeg.calls || [];
                parentLeg.calls.push(leg);

                if (!sticky) {
                    // Register this callback as one which will should be cleaned up by other non-sticky callbacks
                    stickies.push(leg);
                }

                var legId = nextId();

                abortFunctions[legId] = function abort() {
                    var idx = parentLeg.calls.indexOf(leg);
                    if (idx >= 0) {
                        parentLeg.calls.splice(idx, 1);
                    }
                };

                var wrapped = function wrapped() {
                    var args = Array.prototype.slice.call(arguments, 0);
                    try {
                        return invoke(this, cb, root, leg, args);
                    } finally {
                        delete abortFunctions[legId];

                        if (!sticky) {
                            // Non-sticky callbacks remove all other non-sticky callbacks from the calls list.
                            for (var i = 0; i < stickies.length; i++) {
                                var toDelete = stickies[i];
                                if (toDelete != leg) {
                                    var idx = parentLeg.calls.indexOf(toDelete);
                                    if (idx >= 0) {
                                        parentLeg.calls.splice(idx, 1);
                                    }
                                }
                            }
                            // It's nasty to have to check again; the invoke method already checked once
                            checkDone(root);
                        }
                    }
                };

                wrapped.legId = legId;

                return wrapped;
            }
        } else {
            wrap = function identity(cb) {
                return cb;
            }
        }

        return fn(wrap);
    }

    /**
     * Abort the leg with the given id, potentially causing the operation to complete.
     * @param {object} legId the id for the leg, as retrieved from the legId property of a wrapped callback
     */
    function abortLeg(legId) {
        var abort = abortFunctions[legId];
        abort && abort();
    }

    /**
     * A map from the browser's timeout id to the leg id which can be used to abort the leg if the timeout is cleared.
     */
    var timeoutLegs = {};

    var plainTimeout = env.setTimeout;
    env.setTimeout = function Dials_setTimeout() {
        var args = Array.prototype.slice.call(arguments, 0);
        return fork(function(wrap) {
            // 1st argument is the callback function
            args[0] = wrap(args[0], 'timeout');
            var legId = args[0].legId;
            var timeoutId = plainTimeout.apply(null, args);
            timeoutLegs[timeoutId] = legId;
            return timeoutId;
        });
    };

    var plainClearTimeout = env.clearTimeout;
    env.clearTimeout = function Dials_clearTimeout(timeoutId) {
        var legId = timeoutLegs[timeoutId];
        if (legId != null) {
            abortLeg(legId);
            plainClearTimeout(timeoutId);
            delete timeoutLegs[timeoutId];
        }
    };

    if (typeof Ajax == 'object' && Ajax.Request) {
        var plainInitialize = Ajax.Request.prototype.initialize;
        Ajax.Request.prototype.initialize = function Dials_Ajax_Request_initialize(url, options) {
            var thisObj = this;
            return fork(function(wrap) {
                var cause = 'ajax:' + url;
                if (options.onSuccess) {
                    options.onSuccess = wrap(options.onSuccess, cause);
                }
                if (options.onFailure) {
                    options.onFailure = wrap(options.onFailure, cause);
                }
                if (options.onComplete) {
                    options.onComplete = wrap(options.onComplete, cause, true);
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
         * @return {function} a decorated function
         */
        tracked: function(fn) {
            return function() {
                var root = {
                    t0: now(),
                    name: fn.name,
                    queued: 0
                };

                activeOps.push(root);

                return invoke(this, fn, root, root, arguments);
            }
        },

        /**
         * Invoke the given function, passing in another function which can be used to wrap any callbacks such that
         * they form part of the current operation, if one is defined.
         */
        fork: fork,

        /**
         * Invoke the given function and ignore any asynchronous calls queued by it (they will not be tracked as part
         * of the current operation).
         * @param fn the function to invoke
         */
        ignore: function(fn) {
            var root = currentRoot;
            var leg = currentLeg;
            currentRoot = null;
            currentLeg = null;
            fn();
            currentRoot = root;
            currentLeg = leg;
        },

        /**
         * Get/set the name of the current operation or leg.
         * @param name if non-null, the new name of the operation
         * @return {string} the name of the operation
         */
        name: function(name) {
            if (currentLeg) {
                if (name != null) {
                    currentLeg.name = name;
                }
            }
            return currentLeg.name;
        },

        logActivity: function() {
            for (var i = 0; i < activeOps.length; i++) {
                console.log(JSON.stringify(activeOps[i]));
            }
        }
    };
}(this));
