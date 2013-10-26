# Dials

A library which provides basic instrumentation of JavaScript function calls. It records start times, durations and whether the function succeeded or failed. In addition, it detects setTimout calls which were triggered from an instrumented method and tracks them as part of the same operation.

    var myObject = {
        Dials.tracked(function x() {
            // do something
            setTimeout(function y() {
                // do something else
            }, 10);
        });
    }

    Dials.onComplete(function(operation) {
        // log the operation
    });

The callback is fired only once `x` and `y` have completed. The parameter takes the following form:

    operation = {
        t0: 1382737483076   // when the instrumented function was invoked (millis since 1970-01-01)
        name: 'x',          // the name of the instrumented function
        queued: 0,          // always 0 for the initial function
        start: 0,           // always 0 for the initial function
        duration: 12,       // the duration of the instrumented function, not including callbacks
        success: true       // true = returned normally
        calls: [{
            name: 'y',      // the name of the callback function
            queued: 5,      // the time at which setTimeout was called
            start: 15,      // the time at which the callback was invoked
            duration: 7,    // duration of the callback
            success: false  // false = threw an exception
        }]
    };

You can choose to ignore async calls using `Dials.ignore`:

    var myObject = {
        Dials.tracked(function x() {
            // do something
            Dials.ignore(function() {
                setTimeout(function y() {
                    // do something else
                }, 10);
            });
        });
    }

Now the callback will be invoked as soon as `x` completes, without waiting for `y`. The timing data for `y` will not be logged.
