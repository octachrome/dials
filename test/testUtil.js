/*
   Copyright 2013 Christopher Brown

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/
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

function toFit(o) {
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

    function fits(o, a) {
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
                var expected = o[i];
                if (typeof expected == 'function' && expected.matcher) {
                    expected(a[i]);
                } else if (!fits.call(this, o[i], a[i])) {
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
                } else {
                    var expected = o[key];
                    if (typeof expected == 'function' && expected.matcher) {
                        expected(a[key]);
                    } else if (!fits.call(this, o[key], a[key])) {
                        return false;
                    }
                }
            }
            for (var key in o) {
                if (!(key in a)) {
                    var expected = o[key];
                    if (typeof expected == 'function' && expected.matcher) {
                        expected(a[key]);
                    } else {
                        msg('\t\tmissing key: ' + key + '');
                        return false;
                    }
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

    return fits.call(this, o, this.actual);
}

function createMatcher(m, invert) {
    return function(expected) {
        var matcher = function(actual) {
            if (invert) {
                (expect(actual).not[m])(expected);
            } else {
                (expect(actual)[m])(expected);
            }
        }
        matcher.matcher = true;
        return matcher;
    };
}

function createMatchers(spec) {
    spec.expect.not = {};
    var matchersClass = spec.getMatchersClass_();
    for (var key in matchersClass.prototype) {
        if (key != 'report') {
            spec.expect[key] = createMatcher(key);            
            spec.expect.not[key] = createMatcher(key, true);            
        }
    }
}

function installMatchers(spec) {
    spec.addMatchers({
        toFit: toFit
    });
    createMatchers(spec);
}
