import forge from "node-forge";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("Generating fresh RSA 2048 keypair...");
  const keys = forge.pki.rsa.generateKeyPair(2048);

  console.log("Creating self-signed certificate (valid for 25 years)...");
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = "01";
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 25);

  const attrs = [
    { name: "commonName", value: "SoundStream App" },
    { name: "countryName", value: "US" },
    { name: "organizationName", value: "SoundStreamy" },
    { name: "localityName", value: "Austin" }
  ];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);

  console.log("Signing certificate...");
  cert.sign(keys.privateKey, forge.md.sha256.create());

  console.log("Packaging into PKCS12 Keystore container...");
  const password = "";
  const alias = "soundstream_alias";

  // toPkcs12Asn creates the ASN.1 structure representing the PKCS#12 container
  const p12Asn = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], password, {
    generateLocalKeyId: true,
    friendlyName: alias,
    useMac: true
  });

  const p12Der = forge.asn1.toDer(p12Asn).getBytes();
  const keystoreBuffer = Buffer.from(p12Der, "binary");

  const targetPath = path.join(process.cwd(), "android/app/soundstream_release.keystore");
  fs.writeFileSync(targetPath, keystoreBuffer);

  console.log(`✅ SUCCESS: Generated brand-new valid Keystore at: ${targetPath}`);
  console.log(`- Keystore Size: ${keystoreBuffer.length} bytes`);
  console.log(`- Hex Header:    ${keystoreBuffer.subarray(0, 16).toString("hex")}`);
}

main().catch(err => {
  console.error("❌ Failed to generate keystore:", err);
  process.exit(1);
});
