import { google } from 'googleapis';
import * as fs from 'fs/promises';
import { createReadStream, createWriteStream } from 'fs';
import * as path from 'path';
import axios from 'axios';

const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/documents',
];

const MIME_TYPES = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  googleSheet: 'application/vnd.google-apps.spreadsheet',
  googleDoc: 'application/vnd.google-apps.document',
};

const getAuthClient = () => {
  const credentials = {
    type: 'service_account',
    project_id: process.env.GOOGLE_PROJECT_ID,
    private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    client_id: process.env.GOOGLE_CLIENT_ID,
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.GOOGLE_CLIENT_EMAIL}`,
  };

  return new google.auth.GoogleAuth({ credentials, scopes: SCOPES });
};

const uploadFile = async (filePath: string, mimeType: string) => {
  const auth = await getAuthClient();
  const drive = google.drive({ version: 'v3', auth });

  const fileMetadata = { name: path.basename(filePath) };
  const media = { mimeType, body: createReadStream(filePath) };

  const { data } = await drive.files.create({
    requestBody: fileMetadata,
    media,
    fields: 'id,name,webViewLink',
  });

  console.log('File uploaded:', { id: data.id, name: data.name, webViewLink: data.webViewLink });
  return data.id;
};

const convertToDriveFormat = async (fileId: string, sourceMimeType: string) => {
  const auth = await getAuthClient();
  const drive = google.drive({ version: 'v3', auth });

  const targetMimeType = sourceMimeType === MIME_TYPES.xlsx ? MIME_TYPES.googleSheet : MIME_TYPES.googleDoc;

  const { data } = await drive.files.copy({
    fileId,
    requestBody: { mimeType: targetMimeType },
  });

  return data.id;
};

const downloadAsHtml = async (fileId: string, outputPath: string, sourceMimeType: string) => {
  const auth = await getAuthClient();
  const drive = google.drive({ version: 'v3', auth });

  const convertedId = await convertToDriveFormat(fileId, sourceMimeType);

  const { data } = await drive.files.export({
    fileId: convertedId,
    mimeType: 'text/html',
  });

  await fs.writeFile(outputPath, data as string);
  console.log('File downloaded as HTML:', outputPath);
};

const downloadAsPdf = async (fileId: string, outputPath: string, sourceMimeType: string) => {
  const auth = await getAuthClient();
  const drive = google.drive({ version: 'v3', auth });

  try {
    const convertedId = await convertToDriveFormat(fileId, sourceMimeType);
    const accessToken = await auth.getAccessToken();

    const isSheet = sourceMimeType === MIME_TYPES.xlsx;
    const exportUrl = `https://docs.google.com/${isSheet ? 'spreadsheets' : 'document'}/d/${convertedId}/export?format=pdf${isSheet ? '&portrait=false&size=A4&scale=2' : ''}`;

    const { data } = await axios({
      method: 'get',
      url: exportUrl,
      responseType: 'stream',
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    const dest = createWriteStream(outputPath);
    data.pipe(dest);

    await new Promise((resolve, reject) => {
      dest.on('finish', resolve);
      dest.on('error', reject);
    });

    console.log('PDF download completed:', outputPath);
    await drive.files.delete({ fileId: convertedId });
  } catch (error) {
    console.error('Error exporting to PDF:', error.message);
    throw error;
  }
};

const processFile = async (filePath: string, outputFormat: 'html' | 'pdf') => {
  const ext = path.extname(filePath).slice(1);
  const mimeType = MIME_TYPES[ext];
  if (!mimeType) throw new Error(`Unsupported file type: ${ext}`);

  const fileId = await uploadFile(filePath, mimeType);
  const baseName = path.basename(filePath, `.${ext}`);
  const outputPath = `${baseName}.${outputFormat}`;

  if (outputFormat === 'html') {
    await downloadAsHtml(fileId, outputPath, mimeType);
  } else {
    await downloadAsPdf(fileId, outputPath, mimeType);
  }

  return outputPath;
};