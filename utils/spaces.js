const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require('@aws-sdk/client-s3');

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function getClient() {
  return new S3Client({
    endpoint: requireEnv('DO_SPACES_ENDPOINT'),
    region: requireEnv('DO_SPACES_REGION'),
    credentials: {
      accessKeyId: requireEnv('DO_SPACES_KEY'),
      secretAccessKey: requireEnv('DO_SPACES_SECRET'),
    },
  });
}

function encodeObjectKey(key) {
  return String(key)
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');
}

function publicObjectUrl(key) {
  const base = requireEnv('DO_SPACES_CDN_BASE').replace(/\/$/, '');
  return `${base}/${encodeObjectKey(key)}`;
}

async function uploadBuffer({ key, buffer, contentType, contentDisposition = 'inline' }) {
  const Bucket = requireEnv('DO_SPACES_BUCKET');
  const client = getClient();

  await client.send(
    new PutObjectCommand({
      Bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ContentDisposition: contentDisposition,
      ACL: 'public-read',
    })
  );

  return {
    key,
    url: publicObjectUrl(key),
  };
}

async function getObjectStream(key) {
  const Bucket = requireEnv('DO_SPACES_BUCKET');
  const client = getClient();
  return client.send(new GetObjectCommand({ Bucket, Key: key }));
}

async function deleteObject(key) {
  if (!key) return;
  const Bucket = requireEnv('DO_SPACES_BUCKET');
  const client = getClient();
  await client.send(new DeleteObjectCommand({ Bucket, Key: key }));
}

module.exports = {
  uploadBuffer,
  getObjectStream,
  deleteObject,
  publicObjectUrl,
};
