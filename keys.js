var rsa = require("node-rsa");
var fs = require("fs");

function GeneratePair() {

    const key = new rsa({ b: 1024 });
    let secret = "Secret message";

    var publicKey = key.exportKey('public');
    var privateKey = key.exportKey('private');

    let key_public = new rsa(publicKey);
    let key_private = new rsa(privateKey);

    var privateEncrypt = key_private.encryptPrivate(secret);
    var publicDecrypt = key_public.decryptPublic(privateEncrypt);

    console.log("\nPrivate Encrypted: " + privateEncrypt);
    console.log("\nPublic Decrypted: " + publicDecrypt);
}

GeneratePair();


