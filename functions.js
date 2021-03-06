var bcrypt = require('bcryptjs'),
    Q = require('q'),
    pg = require('pg');

module.exports = function(db) {
    db_url= db;
    var func = {
        localRegistration : function (username, password) {
            var deferred = Q.defer();
            var hash = bcrypt.hashSync(password, 8);
            var user = {
                "username": username,
                "password": hash,
                "avatar": 'http://api.adorable.io/avatars/96/' + username + '%40adorable.io'
            };

            console.log(db_url);
            pg.connect(db_url, function(err, client, done) {

                //handle connection errors
                if (err) {
                    done();
                    console.log(err);
                    deferred.reject(new Error(err));
                }

                //check if username is already assigned
                var query = {
                    text: 'SELECT username FROM users WHERE username=$1',
                    values: [username]
                };

                client.query(query, function(err, result) {
                    //username not assigned
                    if(err || result.rows.length === 0) {
                        console.log(err);
                        console.log(username + " is free to use.");

                        client.query("INSERT INTO users(username, password, avatar) VALUES ($1, $2, $3)",
                            [user.username, user.password, user.avatar], function(err, result) {
                                done();
                                if(err) {
                                    console.error(err);
                                    deferred.reject(new Error(err));
                                } else {
                                    console.log("added user " + username);
                                    deferred.resolve(user);
                                }
                            });
                    } else {
                        done();
                        console.log("username already in use");
                        deferred.resolve(false);
                    }
                });
            });

            return deferred.promise;
        },

        localAuthentication: function (username, password) {
            var deferred = Q.defer();

            pg.connect(db_url, function(err, client, done) {
                //handle connection errors
                if (err) {
                    done();
                    console.log(err);
                    deferred.reject(new Error(err));
                }

                //check if username is already assigned
                var query = {
                    text: 'SELECT * FROM users WHERE username=$1',
                    values: [username]
                };

                client.query(query, function(err, result) {
                    done();
                    //username not found
                    if(err || result.rows.length === 0) {
                        console.log(err);
                        deferred.resolve(false);
                    } else {
                        console.log("username found");
                        var hash = result.rows[0].password;
                        if (bcrypt.compareSync(password, hash)) {
                            deferred.resolve(result.rows[0]);
                        } else {
                            deferred.resolve(false);
                        }
                    }
                });

            });

            return deferred.promise;
        }
    };

    return func;
};

