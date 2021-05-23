
class NiceUtils {
    
    // Consider this method to be the ultimate translator between
    // promise-style and callback-style invocations.
    // operation may accept a callback or return a promise.
    // If done is not provided, this method returns a promise.
    // resultLength is the number of parameters that we expect
    // to pass to done.
    performAsyncOperation(operation, resultLength, done) {
        if (done) {
            if (operation.length > 0) {
                operation(done);
            } else {
                operation().then((result) => {
                    if (resultLength > 1) {
                        done(...result);
                    } else if (resultLength === 1) {
                        done(result);
                    } else {
                        done();
                    }
                });
            }
        } else {
            if (operation.length > 0) {
                return new Promise((resolve) => {
                    operation((...args) => {
                        if (resultLength > 1) {
                            resolve(args);
                        } else if (resultLength === 1) {
                            resolve(args[0]);
                        } else {
                            resolve();
                        }
                    });
                });
            } else {
                return operation();
            }
        }
    }
}

const niceUtils = new NiceUtils();

module.exports = { niceUtils };


