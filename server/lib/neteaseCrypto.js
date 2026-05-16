import crypto from "node:crypto";

// NetEase's web client wraps many requests in this "weapi" encryption format.
// The MCP uses it for personal/local access when no official OpenAPI auth is set up.
const NONCE = "0CoJUm6Qyw8W8jud";
const IV = "0102030405060708";
const PUBLIC_EXPONENT = "010001";
const MODULUS =
  "00e0b509f6259df8642dbc35662901477df22677ec152b5ff68ace615bb7b725152b3ab17a876aea8a5aa76d2e417629ec4ee341f56135fccf695280104e0312ecbda92557c93870114af6c9d05c4f7f0c3685b7a46bee255932575cce10b424d813cfe4875d3e82047b97ddef52741d546b8e289dc6935b3ece0462db0a22b8e7";

function modPow(base, exponent, modulus) {
  // Native BigInt modular exponentiation keeps RSA encryption dependency-free.
  let result = 1n;
  let value = base % modulus;
  let power = exponent;
  while (power > 0n) {
    if (power & 1n) result = (result * value) % modulus;
    power >>= 1n;
    value = (value * value) % modulus;
  }
  return result;
}

function aesEncrypt(text, key) {
  const cipher = crypto.createCipheriv("aes-128-cbc", Buffer.from(key), Buffer.from(IV));
  cipher.setAutoPadding(true);
  return Buffer.concat([cipher.update(text, "utf8"), cipher.final()]).toString("base64");
}

function rsaEncrypt(text) {
  const reversed = [...text].reverse().join("");
  const hexText = Buffer.from(reversed).toString("hex");
  return modPow(
    BigInt(`0x${hexText}`),
    BigInt(`0x${PUBLIC_EXPONENT}`),
    BigInt(`0x${MODULUS}`),
  )
    .toString(16)
    .padStart(256, "0");
}

function createSecretKey() {
  const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let key = "";
  for (let i = 0; i < 16; i += 1) {
    key += alphabet[crypto.randomInt(alphabet.length)];
  }
  return key;
}

export function createWeapiPayload(data) {
  // The web API expects double AES encryption plus RSA encryption of the AES key.
  const secretKey = createSecretKey();
  const text = JSON.stringify({ ...data, csrf_token: data.csrf_token ?? "" });
  return new URLSearchParams({
    params: aesEncrypt(aesEncrypt(text, NONCE), secretKey),
    encSecKey: rsaEncrypt(secretKey),
  });
}
