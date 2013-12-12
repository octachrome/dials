describe('xhr-poc', function() {
    it('should find out about XHR', function() {
        var xhr = new XMLHttpRequest();
        for (var key in xhr) {
            console.log(key + ':' + xhr[key]);
        }
    });

    it('should override XHR', function() {
        var oldXHR = XMLHttpRequest;
        XMLHttpRequest = function() {
        };

        XMLHttpRequest.prototype = {
            send: function() {
                console.log('yay');
            }
        };

        var xhr = new XMLHttpRequest();
        xhr.send();

        console.log('here1');

        var x = new oldXHR();
        x.onreadystatechange = function() {
            console.log(x.readyState);
        }
        x.open('GET', 'base/test-data/test.json', true);
        console.log('here2');
        x.send();
        console.log('here3');

        waits(1000);
    });
});
