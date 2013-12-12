describe('xhr proxy', function() {
    var xhr;

    beforeEach(function() {
        xhr = new XhrProxy();
    });

    it('should complete a normal AJAX request', function() {
        var json;

        xhr.open('get', 'base/test-data/test.json', true);

        xhr.onreadystatechange = function() {
            if (xhr.readyState = 4) {
                json = xhr.responseText;
            }
        };

        xhr.send();

        waitsFor(function() {
            return json;
        });

        runs(function() {
            expect(/{"test":true}/.match(json)).toBe(true);
        });
    });
});
