describe('xhr proxy', function() {
    var xhr;

    beforeEach(function() {
        xhr = new XhrProxy();
    });

    it('should complete a normal AJAX request', function() {
        var status, statusText, responseText, contentType, headers;

        xhr.open('GET', 'base/test-data/test.json', true);

        xhr.onreadystatechange = function() {
            if (xhr.readyState == 4) {
                status = xhr.status;
                statusText = xhr.statusText;
                responseText = xhr.responseText;
                contentType = xhr.getResponseHeader('Content-Type');
                headers = xhr.getAllResponseHeaders();
            }
        };

        xhr.send();

        waitsFor(function() {
            return status != null;
        });

        runs(function() {
            expect(status).toBe(200);
            expect(statusText).toBe('OK');
            expect(/{"test":true}/.match(responseText)).toBeTruthy();
            expect(contentType).toBe('application/json');
            expect(/Content-Type: application\/json/m.match(headers)).toBeTruthy();
        });
    });

    it('should be able to set headers', function() {
        var responseText;

        xhr.open('GET', 'header-test', true);
        xhr.setRequestHeader('X-Header-Test', 'Abc');

        xhr.onreadystatechange = function() {
            if (xhr.readyState == 4) {
                responseText = xhr.responseText;
            }
        };

        xhr.send();

        waitsFor(function() {
            return responseText;
        });

        runs(function() {
            expect(responseText).toBe('Abc');
        });
    });

    it('should populate responseXML', function() {
        var responseXML, connection;

        xhr.open('GET', 'base/test-data/test.xml', true);

        xhr.onreadystatechange = function() {
            if (xhr.readyState == 4) {
                responseXML = xhr.responseXML;
                connection = xhr.getResponseHeader('Connection');
            }
        };

        xhr.send();

        waitsFor(function() {
            return responseXML != null;
        });

        runs(function() {
            var test = responseXML.getElementsByTagName('test');
            expect(test.length).toBe(1);
            expect(connection).toBe('keep-alive');
        });
    });

    it('should abort an AJAX request', function() {
        var status, statusText, responseText;

        xhr.open('GET', 'base/test-data/test.json', true);

        xhr.onreadystatechange = function() {
            if (xhr.readyState == 4) {
                status = xhr.status;
                statusText = xhr.statusText;
                responseText = xhr.responseText;
            }
        };

        xhr.send();

        runs(function() {
            xhr.abort();
        });

        waitsFor(function() {
            return xhr.readyState == 4;
        });

        runs(function() {
            expect(status).toBe(0);
            expect(statusText).toBe(isIE() ? 'Unknown' : '');
            expect(responseText).toBe('');
        });
    });
});
