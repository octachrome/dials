'use strict';

function isIE() {
    return /MSIE|Trident/.test(navigator.userAgent);
}

function deepCopy(o) {
    if (o == null) {
        return null;
    } else if (o instanceof Array) {
        copy = [];
        for (var i = 0; i < o.length; i++) {
            copy[i] = deepCopy(o[i]);
        }
        return copy;
    } else if (typeof o == 'object') {
        var copy = {};
        for (var key in o) {
            if (o.hasOwnProperty(key)) {
                copy[key] = deepCopy(o[key]);
            }
        }
        return copy;
    } else {
        return o;
    }
}

function now() {
    return new Date().getTime();
}

function work(delay) {
    var start = now();
    while (now() - start < delay);
}

function toNearlyEqual(o) {
    var message = '';
    var indent = '';

    function printable(o) {
        if (o == null) {
            return 'null';
        } else if (o instanceof Array) {
            return '<array>';
        } else if (typeof o == 'object') {
            return '<object>';
        } else {
            return String(o);
        }
    }

    function expect(expected) {
        message += '\t\texpected ' + printable(expected);
    }

    function msg(m) {
        message += m;
    }

    function incIndent() {
        indent += ' ';
    }

    function decIndent() {
        indent = indent.substring(1);
    }

    function nearlyEquals(o, a, delta) {
        if (a == null) {
            msg('null');

            if (o != null) {
                expect(o);
                return false;
            } else {
                return true;
            }

        } else if (a instanceof Array) {
            msg('[');

            if (!(o instanceof Array)) {
                expect(o);
                return false;
            }
            msg('\n');
            incIndent();

            for (var i = 0; i < a.length; i++) {
                if (i != 0) {
                    msg(',\n');
                }
                msg(indent);
                if (!nearlyEquals.call(this, o[i], a[i], delta)) {
                    return false;
                }
            }
            msg('\n');
            if (i < o.length) {
                expect(o[i]);
                msg(' (missing element)');
                return false;
            }
            decIndent();
            msg(indent + ']');
            return true;

        } else if (typeof a == 'object') {
            msg('{');
            if (o == null || o instanceof Array || typeof o != 'object') {
                expect(o);
                return false;
            }
            msg('\n');
            incIndent();

            var first = true;
            for (var key in a) {
                if (!first) {
                    msg(',\n');
                } else {
                    first = false;
                }
                msg(indent + key + ': ')
                if (!(key in o)) {
                    msg('\t\tunexpected key');
                    return false;
                } else if (key == 't0' || key == 'queued' || key == 'started' || key == 'duration'
                    || key == 'totalDuration') {
                    var diff = o[key] - a[key];
                    if (diff > delta || diff < -delta) {
                        msg(a[key]);
                        expect('~' + o[key]);
                        return false;
                    }
                } else if (isIE() && key == 'name') {
                    // IE does not support Function.name
                    return true;
                } else if (!nearlyEquals.call(this, o[key], a[key], delta)) {
                    return false;
                }
            }
            for (var key in o) {
                if (!(key in a)) {
                    msg('\t\tmissing key: ' + key + '');
                    return false;
                }
            }
            decIndent();
            msg('\n' + indent + '}');
            return true;

        } else {
            msg(a);
            if (!this.env.equals_(o, a)) {
                expect(o, a);
                return false;
            } else {
                return true;
            }
        }
    }

    this.message = function() {
        return [message];
    };

    // 5 is good enough for Chrome; timeouts in Firefox are sometimes 20ms off
    return nearlyEquals.call(this, o, this.actual, 5);
}
