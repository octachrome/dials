'use strict';

(function(env) {
    var plainXhr = XMLHttpRequest;

    /**
     * Proxies XMLHttpRequest so that we can override some of its methods. Only used in browsers
     * which do not allow XMLHttpRequest.prototype to be modified directly (IE7).
     */
    function XhrProxy() {
        var xhr = new plainXhr();
        var thisObj = this;

        xhr.onreadystatechange = function() {
            thisObj.readyState = xhr.readyState;
            if (xhr.readyState == 4) {
                thisObj.responseText = xhr.responseText;
                thisObj.responseXML = xhr.responseXML;
                thisObj.status = xhr.status;
                thisObj.statusText = xhr.statusText;
            }
            if (thisObj.onreadystatechange) {
                thisObj.onreadystatechange.apply(this, arguments);
            }
        };

        this._xhr = xhr;
        this.readyState = 0;
    }

    XhrProxy.prototype = {
        open: function open(method, url, async, user, password) {
            this._xhr.open(method, url, async, user, password);
        },

        send: function send(body) {
            this._xhr.send(body);
        },

        abort: function send(body) {
            this._xhr.abort(body);
        },

        setRequestHeader: function setRequestHeader(header, value) {
            this._xhr.setRequestHeader(header, value);
        }
    };

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
            leg.success = true;
        } catch (e) {
            leg.success = false;
            error = e;
        }

        var end = now();
        currentRoot = prevRoot;
        currentLeg = prevLeg;

        leg.duration = end - start;
        root.totalDuration = end - root.t0;

        checkDone(root);

        if (error) {
            throw error;
        } else {
            return result;
        }
    }

    /**
     * Implementation of Array.indexOf for IE7.
     */
    function indexOf(array, element) {
        for (var i = 0; i < array.length; i++) {
            if (array[i] == element) {
                return i;
            }
        }
        return -1;
    }

    /**
     * Check whether the given operation is complete, and if so fires the onComplete listener.
     */
    function checkDone(op) {
        try {
            var i = indexOf(activeOps, op);
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
     * Wraps a callback with the code to re-enter the operation. The first call to the wrapped callback completes
     * the operation (unless the callback registers any more async calls). If you want to call the callback several
     * times, you need to rewrap it.
     * @param cb {function} the callback to wrap
     * @param cause {string} a description of what triggered the callback
     * @return {function} a wrapped callback
     */
    function wrap(cb, cause) {
        if (currentRoot) {
            var root = currentRoot;
            var parentLeg = currentLeg;

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

            var legId = nextId();

            abortFunctions[legId] = function abort() {
                var idx = indexOf(parentLeg.calls, leg);
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
                }
            };

            wrapped.legId = legId;

            return wrapped;
        } else {
            return cb;
        }
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
        // 1st argument is the callback function
        args[0] = wrap(args[0], 'timeout');
        var legId = args[0].legId;
        var timeoutId = plainTimeout.apply(null, args);
        timeoutLegs[timeoutId] = legId;
        return timeoutId;
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

    if (typeof XMLHttpRequest != 'undefined') {
        if (!XMLHttpRequest.prototype) {
            // In IE7 and possibly other old browsers, we have to proxy XMLHttpRequest in order to
            // override the open and send methods.
            XMLHttpRequest = XhrProxy;
        }

        var plainOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function Dials_XMLHttpRequest_open() {
            this.Dials_url = arguments[1];
            plainOpen.apply(this, arguments);
        };

        var plainSend = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.send = function Dials_XMLHttpRequest_send() {
            var args = Array.prototype.slice.call(arguments, 0);
            var thisObj = this;
            var url = this.Dials_url;
            var cause = 'ajax:' + url;

            if (thisObj.onreadystatechange) {
                var plain = thisObj.onreadystatechange;
                var wrapped = wrap(thisObj.onreadystatechange, cause);
                thisObj.onreadystatechange = function() {
                    if (thisObj.readyState == 4) {
                        return wrapped();
                    } else {
                        return plain();
                    }
                };
            }

            return plainSend.apply(thisObj, args);
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
         * @see wrap, above.
         */
        wrap: wrap,

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

    if (env.jasmine) {
        env.XhrProxy = XhrProxy;
    }
}(this));
