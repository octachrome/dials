# Dials

Dials helps you to understand how long your application takes to respond to user interactions. It does this by wrapping functions with code to record the start time and duration.

This sounds simple, but the problem is that a single mouse click often results in a relatively short-lived function call, which might trigger an Ajax request, whose callback might then do some rendering, then set a timeout, until eventually the user perceives that the system has finished responding. Timing the intial function call doesn't tell you anything useful. What you really want to know is the time between the start of the initial function call and the end of the latest finishing asynchronous call which was caused by it.

Dials does this by keeping track of the asynchronous calls which are triggered by the initial function, and wrapping the callbacks for these asynchronous calls with more timing code (and also code which detects asynchronous calls triggered by *those* callbacks, and so on).

## How to use it

Dials only tracks the functions you tell it to track. Use the function decorator `Dials.tracked` to create a tracked function:

    MyClass.prototype = {
        buttonClicked: Dials.tracked(function buttonClicked() {
            // do something
            setTimeout(function callback() {
                // do something else
            }, 10);
        })
    };

Elsewhere in your application, register a function to be called whenever an operation completes:

    Dials.onComplete(function(operation) {
        // log the operation
    });

The callback is fired only after both `buttonClicked` and `callback` have completed. The operation takes the following form:

    operation = {
        t0: 1382737483076,      // when the instrumented function was invoked (millis since 1970-01-01)
        name: 'buttonClicked',  // the name of the instrumented function, if it is a named function
        queued: 0,              // always 0 for the initial function
        start: 0,               // always 0 for the initial function
        duration: 12,           // the duration of the instrumented function, not including callbacks
        success: true           // true = returned normally
        calls: [{
            name: 'callback',   // the name of the callback function, if it is a named function
            cause: 'timeout',   // what kind of event triggered the callback
            queued: 5,          // the time (relative to t0) at which setTimeout was called
            start: 15,          // the time (relative to t0) at which the callback started executing
            duration: 7,        // the duration of the callback
            success: false      // false = the callback threw an exception
        }]
    };

The callback chain can extend to an arbitrary depth, and there is no limit to how many asynchronous function calls can be triggered by each function. Dials does not record all the function calls in your code; it records a single entry for each  thread of execution. In other words, if function `buttonClicked` calls function `doStuff`, only function `buttonClicked` is recorded:

    MyClass.prototype = {
        buttonClicked: Dials.tracked(function buttonClicked() {
            this.doStuff();
        }),

        doStuff: function() {
            // do some stuff
        }
    };

The above code results in this simple operation:

    operation = {
        t0: 1382737483076,
        name: 'buttonClicked',
        queued: 0,
        start: 0,
        duration: 12,
        success: true
    };

You can choose to ignore all async calls triggered by a block of code by wrapping it with `Dials.ignore`:

    var f = Dials.tracked(function f() {
        // The anonymous function will be invoked immediately (synchronously)
        Dials.ignore(function() {
            setTimeout(function callback() {
                // Don't record this
            }, 10);
        });
    });

Now the callback will be invoked as soon as `f` completes, without waiting for `callback`. The timing data for `callback` will not be logged.

## Extending Dials

Dials currently detects timeouts installed using the `setTimeout` function, and Ajax calls initiated using the `Ajax.Request` function from Prototype (Dials must be included after Prototype in order to make this work). I may add support for other Ajax libraries if I need them. In the meantime it is relatively easy to implement them yourself using the `Dials.fork` function. This example defines a simplistic method which uses a dynamic script tag to implement cross-domain AJAX requests:

    function ajaxCall(url, callback) {
        // The anonymous function below will be invoked immediately
        Dials.fork(function (wrap) {
            var script = document.createElement('script');
            script.src = url;
            // Calling 'wrap' causes Dials to wait until this callback has been invoked before it will consider the
            // outer operation to be complete. The second parameter will be recorded in the 'cause' property.
            script.onload = wrap(callback, 'ajax:' + url);
            document.body.appendChild(script);
        });
    }

If this function is called from a `Dials.tracked` function, it will make sure the callback forms part of the operation that gets recorded. Calling the function from a normal JavaScript function will not do anything: the wrap function just returns the unmodified callback.
