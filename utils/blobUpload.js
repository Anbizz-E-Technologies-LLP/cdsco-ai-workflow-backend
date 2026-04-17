const { BlobServiceClient } = require("@azure/storage-blob");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const {
  generateBlobSASQueryParameters,
  BlobSASPermissions,
  StorageSharedKeyCredential,
} = require("@azure/storage-blob");

require("dotenv").config();

const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const AZURE_CONTAINER_NAME            = process.env.AZURE_CONTAINER_NAME;
const AZURE_STORAGE_ACCOUNT_NAME      = process.env.AZURE_STORAGE_ACCOUNT_NAME;
const AZURE_STORAGE_ACCOUNT_KEY       = process.env.AZURE_STORAGE_ACCOUNT_KEY;

if (!AZURE_STORAGE_CONNECTION_STRING) throw new Error("Missing env: AZURE_STORAGE_CONNECTION_STRING");
if (!AZURE_CONTAINER_NAME)            throw new Error("Missing env: AZURE_CONTAINER_NAME");
if (!AZURE_STORAGE_ACCOUNT_NAME)      throw new Error("Missing env: AZURE_STORAGE_ACCOUNT_NAME");
if (!AZURE_STORAGE_ACCOUNT_KEY)       throw new Error("Missing env: AZURE_STORAGE_ACCOUNT_KEY");

let _sharedKeyCredential = null;
let _containerClient     = null;

function getSharedKeyCredential() {
  if (!_sharedKeyCredential) {
    _sharedKeyCredential = new StorageSharedKeyCredential(
      AZURE_STORAGE_ACCOUNT_NAME,
      AZURE_STORAGE_ACCOUNT_KEY
    );
  }
  return _sharedKeyCredential;
}

function getContainerClient() {
  if (!_containerClient) {
    const blobServiceClient = BlobServiceClient.fromConnectionString(
      AZURE_STORAGE_CONNECTION_STRING
    );
    _containerClient = blobServiceClient.getContainerClient(AZURE_CONTAINER_NAME);
  }
  return _containerClient;
}

async function uploadToAzureBlob(file) {
  try {
    const { buffer: fileBuffer, originalname, mimetype, fieldname } = file;
    const fileExtension  = path.extname(originalname);
    const uniqueFileName = `${uuidv4()}${fieldname}${fileExtension}`;

    const blockBlobClient = getContainerClient().getBlockBlobClient(uniqueFileName);

    await blockBlobClient.uploadData(fileBuffer, {
      blobHTTPHeaders: { blobContentType: mimetype },
    });
    return { url: blockBlobClient.url, uniqueFileName };
  } catch (error) {
    console.error("Azure Blob Upload Error:", error);
    throw new Error("Failed to upload file to Azure");
  }
}

async function deleteFromAzureBlob(fileName) {
  try {
    const blobClient = getContainerClient().getBlobClient(fileName);
    const response   = await blobClient.deleteIfExists();

    if ( response.succeeded) {
      console.log(`File deleted successfully`);
      return true;
    } else {
      console.log(`File not found or already deleted: ${fileName}`);
      return false;
    }
  } catch (error) {
    console.error("Error deleting file from Azure Blob Storage:", error.message);
    return false;
  }
}

function generateSasUrl(fileName) {
  const sasOptions = {
    containerName: AZURE_CONTAINER_NAME,
    blobName:      fileName,
    permissions:   BlobSASPermissions.parse("r"),
    startsOn:      new Date(),
    expiresOn:     new Date(Date.now() + 5 * 60 * 1000), 
  };

  const sasToken = generateBlobSASQueryParameters(
    sasOptions,
    getSharedKeyCredential()
  ).toString();

  return `https://${AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net/${AZURE_CONTAINER_NAME}/${fileName}?${sasToken}`;
}

module.exports = { uploadToAzureBlob, deleteFromAzureBlob, generateSasUrl };
