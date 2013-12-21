describe('xhr proxy', function() {
    var xhr;

    beforeEach(function() {
        xhr = new XhrProxy();
    });

    it('should complete a normal AJAX request', function() {
        var status, statusText, json;

        xhr.open('get', 'base/test-data/test.json', true);

        xhr.onreadystatechange = function() {
            if (xhr.readyState = 4) {
                status = xhr.status;
                statusText = xhr.statusText;
                json = xhr.responseText;
            }
        };

        xhr.send();

        waitsFor(function() {
            return json;
        });

        runs(function() {
            expect(status).toBe(200);
            expect(statusText).toBe('OK');
            expect(/{"test":true}/.match(json)).toBe(true);
        });
    });

    it('should abort an AJAX request', function() {
        var status, statusText, json;

        xhr.open('get', 'base/test-data/test.json', true);

        xhr.onreadystatechange = function() {
            if (xhr.readyState = 4) {
                status = xhr.status;
                statusText = xhr.statusText;
                json = xhr.responseText;
            }
        };

        xhr.send();

        waits(1);

        runs(function() {
            xhr.abort();
        });

        waitsFor(function() {
            return xhr.readyState == 4;
        });

        runs(function() {
            if (isIE()) {
                expect(status).toBe(200);
                expect(statusText).toBe('OK');
            } else {
                expect(status).toBe(0);
                expect(statusText).toBe('');
            }
            expect(json).toBe('');
        });
    });
});
