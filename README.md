# Dials

Dials helps you to understand how long your application takes to respond to user interactions. It does this by wrapping functions with code to record the start time and duration. This sounds simple, but the problem is that a single mouse click often results in a relatively short-lived function call, which might trigger an Ajax request, whose callback might then do some rendering, then set a timeout, until eventually the user perceives that the system has finished responding. Timing the intial function call doesn't tell you anything useful. What you really want to know is the time between the start of the initial function call and the end of the latest finishing asynchronous call which was caused by it.

Dials does this by keeping track of the asynchronous calls which are triggered by the initial function, and wrapping the callbacks for these asynchronous calls with more timing code (and also code which detects asynchronous calls triggered by *those* callbacks, and so on).

Dials currently detects timeouts installed using the setTimeout function, and Ajax calls initiated using the Ajax.Request function from Prototype (Dials must be included after Prototype in order to make this work). I may add support for other Ajax libraries if I need them. In the meantime it is relatively easy to implement them yourself (see the section below on Extending Dials.)

## How to use it

Dials only tracks the functions you tell it to track. Use the method decorator `Dials.tracked` to create a tracked function:

    MyClass.prototype = {
        buttonClicked: Dials.tracked(function x() {
            // do something
            setTimeout(function y() {
                // do something else
            }, 10);
        })
    };

Elsewhere in your application, register a function to be called whenever an operation completes:

    Dials.onComplete(function(operation) {
        // log the operation
    });

The callback is fired only after both `x` and `y` have completed. The operation takes the following form:

    operation = {
        t0: 1382737483076   // when the instrumented function was invoked (millis since 1970-01-01)
        name: 'x',          // the name of the instrumented function, if it is a named function
        queued: 0,          // always 0 for the initial function
        start: 0,           // always 0 for the initial function
        duration: 12,       // the duration of the instrumented function, not including callbacks
        success: true       // true = returned normally
        calls: [{
            name: 'y',          // the name of the callback function, if it is a named function
            cause: 'timeout',   // what kind of event triggered the callback
            queued: 5,          // the time (relative to t0) at which setTimeout was called
            start: 15,          // the time (relative to t0) at which the callback started executing
            duration: 7,        // the duration of the callback
            success: false      // false = the callback threw an exception
        }]
    };

You can choose to ignore async calls by wrapping them with `Dials.ignore`:

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

The callback chain can extend to an arbitrary depth, and there is no limit to how many asynchronous function calls can be triggered by each function. Dials only records an entry when a new thread of execution is started. In other words, if function `a` calls function `b` directly, only function `a` is recorded:



## Extending Dials

*TO DO*
