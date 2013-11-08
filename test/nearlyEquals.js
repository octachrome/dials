'use strict';

function nearlyEquals(o, a, delta) {
    if (a === o) {
        return true;
    }

    if (Array.isArray(a) && Array.isArray(o)) {
        if (a.length != o.length) {
            return false;
        }
        for (var i = 0; i < o.length; i++) {
            if (!nearlyEquals.call(this, o[i], a[i], delta)) {
                return false;
            }
        }
        return true;

    } else if (typeof o == 'object') {
        for (var key in o) {
            if (!(key in a)) {
                return false;
            } else if (key == 't0' || key == 'queued' || key == 'started' || key == 'duration'
                || key == 'totalDuration') {
                var diff = o[key] - a[key];
                if (diff > delta || diff < -delta) {
                    return false;
                }
            } else if (!nearlyEquals.call(this, a[key], o[key])) {
                return false;
            }
        }
        for (var key in a) {
            if (!(key in o)) {
                return false;
            }
        }
        return true;

    } else {
        return this.env.equals_(a, o);
    }
}
