import { promises as fs } from "fs";
import path, { basename, join, extname, dirname } from "path";
import { promisify } from "util";
import { exec } from "child_process";
import { TextService } from "./TextService";
import TurndownService from "turndown";
import { google } from "googleapis";
import axios from "axios";
import { createReadStream, createWriteStream } from "fs";
import { v4 as uuidv4 } from "uuid";
import { fromPath } from "pdf2pic";
import sharp from "sharp";
import * as FileType from "file-type";
import mime from "mime-types";
import { URL } from 'url';
import { AudioService } from "./AudioService";
import { OpenAIService } from "./OpenAIService";
import { WebSearchService } from './WebSearch';
import type { IDoc } from "../types/types";
import { generateMetadata } from '../utils/metadata';

const execAsync = promisify(exec);

export class FileService {
  private textService = new TextService();
  private turndownService = new TurndownService();
  private audioService = new AudioService();
  private openAIService = new OpenAIService();
  private webSearchService = new WebSearchService();

  // Constants and Configuration
  private readonly SCOPES = [
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/documents",
  ];

  private readonly STORAGE_DIR = path.join(process.cwd(), 'web', 'storage');
  private readonly TEMP_DIR = path.join(this.STORAGE_DIR, 'temp');

  private readonly MIME_TYPES: any = {
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    pdf: "application/pdf",
    googleDoc: "application/vnd.google-apps.document",
    googleSheet: "application/vnd.google-apps.spreadsheet",
  };

  private readonly mimeTypes = {
    text: {
      extensions: [".txt", ".md", ".json", ".html", ".csv"],
      mimes: [
        "text/plain",
        "text/markdown",
        "application/json",
        "text/html",
        "text/csv",
      ],
    },
    audio: {
      extensions: [".mp3", ".wav", ".ogg"],
      mimes: ["audio/mpeg", "audio/wav", "audio/ogg"],
    },
    image: {
      extensions: [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"],
      mimes: [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/bmp",
        "image/webp",
      ],
    },
    document: {
      extensions: [".pdf", ".doc", ".docx", ".xls", ".xlsx"],
      mimes: [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ],
    },
  };

  private authClient: any;

  constructor() {
    this.initializeGoogleAuth();
    // Ensure the storage directory exists
    this.ensureStorageDirectory();
  }

  private async ensureStorageDirectory() {
    try {
      await fs.mkdir(this.STORAGE_DIR, { recursive: true });
      console.log(`Storage directory ensured at ${this.STORAGE_DIR}`);
    } catch (error) {
      console.error(`Error creating storage directory: ${error}`);
      throw error;
    }
  }

  // Google Drive Operations
  private async initializeGoogleAuth() {
    try {
      const credentials = {
        type: "service_account",
        project_id: process.env.GOOGLE_PROJECT_ID,
        private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        client_id: process.env.GOOGLE_CLIENT_ID,
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url:
          "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.GOOGLE_CLIENT_EMAIL}`,
      };

      this.authClient = new google.auth.GoogleAuth({
        credentials,
        scopes: this.SCOPES,
      });
    } catch (error: any) {
      console.error(`Failed to initialize Google Auth: ${error.message}`);
      throw error;
    }
  }

  // File Operations
  /**
   * Writes a temporary file with validation.
   * @param fileContent - The content of the file as a Buffer.
   * @param fileName - The name of the file.
   * @returns The path to the temporary file.
   */
  async writeTempFile(fileContent: Buffer, fileName: string): Promise<string> {
    const tempUUID = uuidv4();
    const fileExt = extname(fileName);
    const fileNameWithoutExt = basename(fileName, fileExt);
    const tempFileName = `${fileNameWithoutExt}-${tempUUID}${fileExt}`;
    const relativeTempPath = path.join('temp', tempFileName);
    const absoluteTempPath = path.join(this.STORAGE_DIR, 'temp', tempFileName);
  
    try {
      await fs.mkdir(path.dirname(absoluteTempPath), { recursive: true });
      await fs.writeFile(absoluteTempPath, fileContent);
  
      // Determine MIME type
      const mimeType = await this.getMimeTypeFromBuffer(fileContent, fileName);
      
      // Determine file category based on MIME type
      const fileType = this.getFileCategoryFromMimeType(mimeType);
  
      // Check MIME type after writing the file
      await this.checkMimeType(absoluteTempPath, fileType);
  
      return relativeTempPath;
    } catch (error: any) {
      console.error(`Failed to write temp file: ${error.message}`);
      throw error;
    }
  }

  /**
   * Saves a file with validation.
   * @param fileContent - The content of the file as a Buffer.
   * @param fileName - The name of the file.
   * @param fileUUID - A unique identifier for the file.
   * @param type - The type of the file ("audio" | "text" | "image").
   * @param source - An optional source of the file.
   * @returns Information about the saved file.
   */
  async save(
    fileContent: Buffer,
    fileName: string,
    fileUUID: string,
    type: "audio" | "text" | "image" | "document",
    source?: string
  ): Promise<{
    type: "audio" | "text" | "image" | "document";
    path: string;
    fileName: string;
    fileUUID: string;
    source?: string;
  }> {
    try {
      const date = new Date();
      const datePath = `${date.getFullYear()}-${(
        date.getMonth() + 1
      ).toString().padStart(2, "0")}-${date
        .getDate()
        .toString()
        .padStart(2, "0")}`;
      const relativeDirPath = path.join(type, datePath, fileUUID);
      const absoluteDirPath = path.join(this.STORAGE_DIR, relativeDirPath);
      await fs.mkdir(absoluteDirPath, { recursive: true });

      // Determine the MIME type and extension
      const mimeType = await this.getMimeTypeFromBuffer(fileContent, fileName);
      const originalExt = extname(fileName).slice(1);
      const fileExt = originalExt || mime.extension(mimeType) || this.getDefaultExtension(type);

      // Ensure the MIME type matches the expected type
      if (!this.mimeTypes[type].mimes.includes(mimeType)) {
        throw new Error(
          `File MIME type ${mimeType} does not match expected type ${type}`
        );
      }

      // Construct the new file name
      const fileNameWithoutExt = basename(fileName, extname(fileName));
      const newFileName = `${fileNameWithoutExt}.${fileExt}`;
      const filePath = path.join(absoluteDirPath, newFileName);

      await fs.writeFile(filePath, fileContent);

      let relativeSource = source;
      if (source) {
        // Always make the source relative to STORAGE_DIR
        relativeSource = path.relative(this.STORAGE_DIR, path.join(this.STORAGE_DIR, source));
      }

      const result = {
        type,
        path: path.join(relativeDirPath, newFileName),
        fileName: newFileName,
        mimeType,
        fileUUID,
        ...(relativeSource && { source: relativeSource }),
      };

      return result;
    } catch (error: any) {
      console.error(`Failed to save file: ${error.message}`);
      throw error;
    }
  }

  /**
   * Reads a text file and returns an IDoc.
   * @param originalPath - The original path to the text file.
   * @param storagePath - The path to the text file in storage.
   * @returns An IDoc containing the file's content.
   */
  async readTextFile(originalPath: string, storagePath: string): Promise<IDoc> {
    try {
      const absolutePath = path.join(this.STORAGE_DIR, storagePath);
      const mimeType = await this.getMimeType(absolutePath);

      if (!this.mimeTypes.text.mimes.includes(mimeType)) {
        throw new Error(`Unsupported text file MIME type: ${mimeType}`);
      }

      const text = await fs.readFile(absolutePath, "utf-8");
      const additionalMetadata = {
        source: originalPath,
        path: storagePath,
        name: basename(originalPath),
        mimeType: mimeType,
      };
      const doc = await this.textService.document(
        text,
        undefined,
        additionalMetadata
      );
      return doc;
    } catch (error: any) {
      console.error(`Failed to read text file: ${error.message}`);
      throw error;
    }
  }

  /**
   * Reads a document file and returns an IDoc.
   * @param originalPath - The original path to the document file.
   * @param storagePath - The path to the document file in storage.
   * @returns An IDoc containing the file's content.
   */
  async readDocumentFile(originalPath: string, storagePath: string): Promise<IDoc> {
    try {
      const absolutePath = path.join(this.STORAGE_DIR, storagePath);
      const mimeType = await this.getMimeType(absolutePath);

      if (!this.mimeTypes.document.mimes.includes(mimeType)) {
        throw new Error(`Unsupported document file MIME type: ${mimeType}`);
      }

      let content: string;

      if (
        [
          this.MIME_TYPES.doc,
          this.MIME_TYPES.docx,
          this.MIME_TYPES.xls,
          this.MIME_TYPES.xlsx,
        ].includes(mimeType)
      ) {
        console.log("Processing office file...", mimeType);
        const { markdown } = await this.processOfficeFile(absolutePath);
        content = markdown;
      } else if (mimeType === this.MIME_TYPES.pdf) {
        content = await this.readPdfFile(absolutePath);
      } else {
        throw new Error(`Unsupported document file MIME type: ${mimeType}`);
      }

      const additionalMetadata = {
        source: originalPath,
        path: storagePath,
        name: basename(originalPath),
        mimeType: mimeType,
      };

      const doc = await this.textService.document(
        content.trim(),
        undefined,
        additionalMetadata
      );

      return doc;
    } catch (error: any) {
      console.error(`Failed to read document file: ${error.message}`);
      throw error;
    }
  }

  // MIME Type Operations
  /**
   * Gets the MIME type of a file.
   * @param filePath - The path to the file.
   * @returns The MIME type as a string.
   */
  async getMimeType(filePath: string): Promise<string> {
    try {
      if (typeof filePath !== "string") {
        throw new Error("Invalid file path: must be a string");
      }
      const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(this.STORAGE_DIR, filePath);
      const fileBuffer = await fs.readFile(absolutePath);
      return this.getMimeTypeFromBuffer(fileBuffer, path.basename(filePath));
    } catch (error: any) {
      console.error(`Failed to get MIME type: ${error.message}`);
      throw error;
    }
  }

  /**
   * Determines the MIME type from a Buffer.
   * @param fileBuffer - The file content as a Buffer.
   * @param fileName - The name of the file.
   * @returns The MIME type as a string.
   */
  async getMimeTypeFromBuffer(
    fileBuffer: Buffer,
    fileName: string
  ): Promise<string> {
    const fileTypeResult = await FileType.fileTypeFromBuffer(fileBuffer);

    if (fileTypeResult) {
      return fileTypeResult.mime;
    } else {
      const mimeType = mime.lookup(fileName);
      if (mimeType) {
        return mimeType;
      } else {
        return "application/octet-stream";
      }
    }
  }

  /**
   * Checks if a file's MIME type matches the expected type.
   * @param filePath - The path to the file.
   * @param type - The expected type ("audio" | "text" | "image").
   */
  private async checkMimeType(
    filePath: string,
    type: "audio" | "text" | "image" | "document"
  ): Promise<void> {
    const mimeType = await this.getMimeType(filePath);

    console.log('mimeType', mimeType);

    if (!this.mimeTypes[type].mimes.includes(mimeType)) {
      throw new Error(`Unsupported MIME type for ${type}: ${mimeType}`);
    }
  }

  // Conversion Utilities
  /**
   * Processes an Office file and returns its Markdown content and PDF path.
   * @param filePath - The path to the Office file.
   * @returns An object containing the Markdown content and PDF path.
   */
  private async processOfficeFile(
    filePath: string
  ): Promise<{ markdown: string; pdfPath: string }> {
    const ext = extname(filePath).slice(1);
    const mimeType = this.MIME_TYPES[ext];
    if (!mimeType) throw new Error(`Unsupported file type: ${ext}`);

    const tempFiles: string[] = [];

    try {
      const fileId = await this.uploadFileToDrive(filePath, mimeType);
      const baseName = basename(filePath, `.${ext}`);

      await fs.mkdir(this.TEMP_DIR, { recursive: true });

      const intermediateFilePath = join(
        this.TEMP_DIR,
        `${baseName}.${ext.includes("xl") ? "csv" : "html"}`
      );
      const pdfPath = join(this.TEMP_DIR, `${baseName}.pdf`);

      tempFiles.push(intermediateFilePath);

      await this.getPlainFileContentsFromDrive(
        fileId,
        intermediateFilePath,
        mimeType
      );
      await this.downloadAsPdf(fileId, pdfPath, mimeType);

      let markdown: string;
      if (ext.includes("xl")) {
        const csvContent = await fs.readFile(intermediateFilePath, "utf-8");
        markdown = this.csvToMarkdown(csvContent);
      } else {
        markdown = await this.convertHTMLToMarkdown(intermediateFilePath);
      }

      return { markdown, pdfPath };
    } catch (error: any) {
      console.error(`Failed to process Office file: ${error.message}`);
      throw error;
    } finally {
      // Clean up temporary files, but not the PDF
      for (const tempFile of tempFiles) {
        await fs.unlink(tempFile).catch(() => {});
      }
    }
  }

  /**
   * Converts CSV content to Markdown.
   * @param csvContent - The CSV content as a string.
   * @returns The Markdown representation of the CSV.
   */
  private csvToMarkdown(csvContent: string): string {
    const [headerLine, ...lines] = csvContent.split("\n");
    const headers = headerLine.split(",");
    const markdownLines = [
      `| ${headers.join(" | ")} |`,
      `| ${headers.map(() => "---").join(" | ")} |`,
      ...lines.map((line) => `| ${line.split(",").join(" | ")} |`),
    ];
    return markdownLines.join("\n");
  }

  /**
   * Converts HTML content to Markdown.
   * @param filePath - The path to the HTML file.
   * @returns The Markdown content as a string.
   */
  private async convertHTMLToMarkdown(filePath: string): Promise<string> {
    try {
      const content = await fs.readFile(filePath, "utf-8");
      return this.turndownService.turndown(content);
    } catch (error: any) {
      console.error(`Failed to convert HTML to Markdown: ${error.message}`);
      throw error;
    }
  }

  // External Tools Checks
  /**
   * Checks if an external command-line tool is available.
   * @param toolName - The name of the tool (e.g., "pdftohtml").
   */
  private async checkExternalTool(toolName: string): Promise<void> {
    try {
      await execAsync(`which ${toolName}`);
    } catch {
      throw new Error(`${toolName} is not installed or not in PATH`);
    }
  }

  // PDF Operations
  /**
   * Reads a PDF file and converts it to Markdown.
   * @param filePath - The path to the PDF file.
   * @returns The Markdown content as a string.
   */
  private async readPdfFile(filePath: string): Promise<string> {
    await this.checkExternalTool("pdftohtml");

    const tempHtmlPath = `${filePath}.html`;
    const tempFiles: string[] = [tempHtmlPath];

    try {
      await execAsync(
        `pdftohtml -s -i -noframes "${filePath}" "${tempHtmlPath}"`
      );

      let htmlContent = await fs.readFile(tempHtmlPath, "utf-8");
      htmlContent = htmlContent.replace(/<!--[\s\S]*?-->/g, "");
      htmlContent = htmlContent.replace(/<title>.*?<\/title>/i, "");
      const markdownContent = this.turndownService.turndown(htmlContent);

      return markdownContent;
    } catch (error: any) {
      console.error(`Failed to read PDF file: ${error.message}`);
      throw error;
    } finally {
      // Clean up temporary files
      for (const tempFile of tempFiles) {
        await fs.unlink(tempFile).catch(() => {});
      }
    }
  }

  // Google Drive Interactions
  /**
   * Uploads a file to Google Drive.
   * @param filePath - The path to the file.
   * @param mimeType - The MIME type of the file.
   * @returns The ID of the uploaded file.
   */
  private async uploadFileToDrive(
    filePath: string,
    mimeType: string
  ): Promise<string> {
    try {
      const auth = await this.authClient.getClient();
      const drive = google.drive({ version: "v3", auth });

      const fileName = basename(filePath);
      if (!fileName) {
        throw new Error("Invalid file path: unable to determine file name");
      }

      const fileMetadata = { name: fileName };
      const media = { mimeType, body: createReadStream(filePath) };

      const { data } = await drive.files.create({
        requestBody: fileMetadata,
        media,
        fields: "id",
      });

      if (!data.id) {
        throw new Error("Failed to upload file: no ID returned");
      }

      return data.id;
    } catch (error: any) {
      console.error(`Failed to upload file to Drive: ${error.message}`);
      throw error;
    }
  }

  /**
   * Converts a file in Google Drive to an editable Google format.
   * @param fileId - The ID of the file in Drive.
   * @param sourceMimeType - The source MIME type.
   * @returns The ID of the converted file.
   */
  private async convertToDriveFormat(
    fileId: string,
    sourceMimeType: string
  ): Promise<string> {
    try {
      const auth = await this.authClient.getClient();
      const drive = google.drive({ version: "v3", auth });

      const targetMimeType = sourceMimeType.includes("sheet")
        ? this.MIME_TYPES.googleSheet
        : this.MIME_TYPES.googleDoc;

      const { data } = await drive.files.copy({
        fileId,
        requestBody: { mimeType: targetMimeType },
      });

      if (!data.id) {
        throw new Error("Failed to copy file: no ID returned");
      }

      return data.id;
    } catch (error: any) {
      console.error(`Failed to convert file in Drive: ${error.message}`);
      throw error;
    }
  }

  /**
   * Retrieves the plain content of a file from Google Drive.
   * @param fileId - The ID of the file in Drive.
   * @param outputPath - The path to save the retrieved content.
   * @param mimeType - The MIME type of the file.
   */
  private async getPlainFileContentsFromDrive(
    fileId: string,
    outputPath: string,
    mimeType: string
  ): Promise<void> {
    try {
      const convertedId = await this.convertToDriveFormat(fileId, mimeType);
      const accessToken = await this.authClient.getAccessToken();

      const isSheet = mimeType.includes("sheet");
      const exportMimeType = isSheet ? "text/csv" : "text/html";
      const exportUrl = `https://www.googleapis.com/drive/v3/files/${convertedId}/export?mimeType=${encodeURIComponent(
        exportMimeType
      )}`;

      const { data } = await axios.get(exportUrl, {
        responseType: "stream",
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const writer = createWriteStream(outputPath);
      data.pipe(writer);

      await new Promise<void>((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });

      await this.deleteDriveFile(convertedId);
    } catch (error: any) {
      console.error(
        `Failed to get file contents from Drive: ${error.message}`
      );
      throw error;
    }
  }

  /**
   * Downloads a file from Google Drive as a PDF.
   * @param fileId - The ID of the file in Drive.
   * @param outputPath - The path to save the PDF.
   * @param mimeType - The MIME type of the file.
   */
  private async downloadAsPdf(
    fileId: string,
    outputPath: string,
    mimeType: string
  ): Promise<void> {
    try {
      const convertedId = await this.convertToDriveFormat(fileId, mimeType);
      const accessToken = await this.authClient.getAccessToken();

      const isSheet = mimeType.includes("sheet");
      const exportUrl = `https://docs.google.com/${
        isSheet ? "spreadsheets" : "document"
      }/d/${convertedId}/export?format=pdf${
        isSheet ? "&portrait=false&size=A4&scale=2" : ""
      }`;

      const { data } = await axios.get(exportUrl, {
        responseType: "stream",
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const writer = createWriteStream(outputPath);
      data.pipe(writer);

      await new Promise<void>((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });

      await this.deleteDriveFile(convertedId);
    } catch (error: any) {
      console.error(`Failed to download PDF from Drive: ${error.message}`);
      throw error;
    }
  }

  /**
   * Deletes a file from Google Drive.
   * @param fileId - The ID of the file to delete.
   */
  private async deleteDriveFile(fileId: string): Promise<void> {
    try {
      const auth = await this.authClient.getClient();
      const drive = google.drive({ version: "v3", auth });

      await drive.files.delete({ fileId });
    } catch (error: any) {
      console.error(`Failed to delete file from Drive: ${error.message}`);
    }
  }

  // Image Processing
  /**
   * Takes screenshots of a file and saves them as images.
   * @param filePath - The path to the file.
   * @param fileName - The name of the file.
   * @returns An array of paths to the saved images.
   */
  async takeScreenshot(
    filePath: string,
    fileName: string
  ): Promise<string[]> {
    try {
      const extension = extname(filePath).toLowerCase();
      const outputBaseName = basename(fileName, extname(fileName));
      const uuid = uuidv4();
      const savedImagePaths: string[] = [];

      let pdfPath: string;
      let options = {
        density: 300,
        saveFilename: `${outputBaseName}_${uuid}`,
        format: "jpeg",
        width: 2480,
        height: 3508,
        quality: 100,
      };

      if ([".doc", ".docx", ".xls", ".xlsx"].includes(extension)) {
        const absoluteFilePath = path.isAbsolute(filePath) ? filePath : path.join(this.STORAGE_DIR, filePath);
        const { pdfPath: generatedPdfPath } = await this.processOfficeFile(
          absoluteFilePath
        );
        pdfPath = generatedPdfPath;
        if ([".xls", ".xlsx"].includes(extension)) {
          options = { ...options, width: 3508, height: 2480 };
        }
      } else if (extension === ".pdf") {
        pdfPath = path.isAbsolute(filePath) ? filePath : path.join(this.STORAGE_DIR, filePath);
      } else {
        throw new Error(
          `Unsupported file type for screenshotting: ${extension}`
        );
      }

      await fs.mkdir(this.TEMP_DIR, { recursive: true });

      const storeAsImage = fromPath(pdfPath, options);
      const pageCount = await this.getPageCount(pdfPath);

      for (let i = 1; i <= pageCount; i++) {
        const result = await storeAsImage(i);
        const outputPath = join(
          this.TEMP_DIR,
          `${outputBaseName}_${i}.jpg`
        );

        await sharp(result.path)
          .resize({
            width: options.width,
            height: options.height,
            fit: sharp.fit.inside,
            withoutEnlargement: true,
          })
          .jpeg({ quality: 90 })
          .toFile(outputPath);

        const imageBuffer = await fs.readFile(outputPath);
        const savedImageInfo = await this.save(
          imageBuffer,
          `${outputBaseName}_${i}.jpg`,
          uuid,
          "image"
        );

        savedImagePaths.push(savedImageInfo.path);

        // Clean up temporary image files
        if (result.path) {
          await fs.unlink(result.path).catch(() => {});
        }
        await fs.unlink(outputPath).catch(() => {});
      }

      // Clean up temporary PDF file
      if (pdfPath.startsWith(this.TEMP_DIR)) {
        await fs.unlink(pdfPath).catch(() => {});
      }

      return savedImagePaths;
    } catch (error: any) {
      console.error(`Failed to take screenshot: ${error.message}`);
      throw error;
    }
  }

  /**
   * Gets the page count of a PDF file.
   * @param pdfPath - The path to the PDF file.
   * @returns The number of pages in the PDF.
   */
  private async getPageCount(pdfPath: string): Promise<number> {
    await this.checkExternalTool("pdfinfo");

    try {
      const absolutePdfPath = path.isAbsolute(pdfPath) ? pdfPath : path.join(this.STORAGE_DIR, pdfPath);
      const { stdout } = await execAsync(
        `pdfinfo "${absolutePdfPath}" | grep Pages:`
      );
      return parseInt(stdout.split(":")[1].trim(), 10);
    } catch (error: any) {
      console.error(`Failed to get page count: ${error.message}`);
      throw error;
    }
  }

  // Utility Functions
  /**
   * Gets the default file extension for a given type.
   * @param type - The file type ("audio" | "text" | "image").
   * @returns The default extension as a string.
   */
  private getDefaultExtension(type: "audio" | "text" | "image" | "document"): string {
    const defaultExtensions = {
      audio: "mp3",
      text: "txt",
      image: "jpg",
      document: "bin"
    };
    return defaultExtensions[type] || "bin";
  }

  /**
   * Fetches a file from a URL and saves it in the appropriate storage category.
   * @param url - The URL of the file to fetch.
   * @param fileUUID - A unique identifier for the file.
   * @returns Information about the saved file.
   */
  async fetchAndSaveUrlFile(url: string, fileUUID: string): Promise<{
    mimeType: string;
    type: "audio" | "text" | "image" | "document";
    path: string;
    fileName: string;
    fileUUID: string;
    source?: string;
  }> {
    try {
      const parsedUrl = new URL(url);
      let fileName = parsedUrl.pathname.split('/').pop() || '';
      
      const possibleExtension = fileName.split('.').pop();
      if (possibleExtension && possibleExtension.includes('?')) {
        fileName = fileName.split('?')[0];
      }

      const fileExtension = extname(fileName).toLowerCase();

      // If the URL doesn't point to a file with a recognizable extension, use web scraping
      if (!fileExtension) {
        const scrapedContent = await this.webSearchService.scrapeUrls([url], fileUUID);

        if (scrapedContent.length > 0 && scrapedContent[0].content) {
          const content = scrapedContent[0].content;
          fileName = `${parsedUrl.hostname}_${fileUUID}.md`;
          const fileContent = Buffer.from(content, 'utf-8');
          
          const savedFile = await this.save(fileContent, fileName, fileUUID, 'text', url);
          return { ...savedFile, mimeType: 'text/markdown' };
        } else {
          throw new Error('Failed to scrape content from the URL');
        }
      }

      // Original file download logic for URLs pointing to files
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      const fileContent = Buffer.from(response.data);

      // New logic to determine MIME type
      let mimeType: string;
      if (this.mimeTypes.text.extensions.includes(fileExtension)) {
        // If the file extension is in the text category, use the corresponding MIME type
        mimeType = mime.lookup(fileExtension) || 'text/plain';
      } else {
        // Otherwise, use the Content-Type header
        mimeType = response.headers['content-type'] || 'application/octet-stream';
      }

      const fileType = this.getFileCategoryFromMimeType(mimeType);

      if (!fileName) {
        fileName = `file_${fileUUID}${fileExtension}`;
      }

      const savedFile = await this.save(fileContent, fileName, fileUUID, fileType, url);

      console.log(`File fetched and saved: ${savedFile.path}`);

      return { ...savedFile, mimeType };
    } catch (error: any) {
      console.error(`Failed to fetch and save file from URL: ${error.message}`);
      throw error;
    }
  }

  /**
   * Determines the file category based on the MIME type.
   * @param mimeType - The MIME type of the file.
   * @returns The file category as "text", "audio", "image", or "document".
   */
  getFileCategoryFromMimeType(mimeType: string): "text" | "audio" | "image" | "document" {
    for (const [category, typeInfo] of Object.entries(this.mimeTypes)) {
      if (typeInfo.mimes.includes(mimeType)) {
        return category as "text" | "audio" | "image" | "document";
      }
    }
    // Default to "document" if no match is found
    return "document";
  }

  async process(filePathOrUrl: string, chunkSize?: number, conversation_uuid?: string): Promise<{ docs: IDoc[] }> {
    let originalPath: string;
    let storagePath: string;
    let fileUUID = uuidv4();
  
    // Check if the input is a URL or a file path
    if (filePathOrUrl.startsWith('http://') || filePathOrUrl.startsWith('https://')) {
      try {
        const savedFile = await this.fetchAndSaveUrlFile(filePathOrUrl, fileUUID);
        originalPath = filePathOrUrl;
        storagePath = savedFile.path;
      } catch (error) {
        console.error('Error fetching and saving URL:', error);
        return { docs: [] };
      }
    } else {
      originalPath = filePathOrUrl;
      const adjustedPath = filePathOrUrl.startsWith('storage/') ? filePathOrUrl.slice(8) : filePathOrUrl;
      const fileContent = await fs.readFile(path.join(this.STORAGE_DIR, adjustedPath));
      const mimeType = await this.getMimeTypeFromBuffer(fileContent, basename(originalPath));
      const type = this.getFileCategoryFromMimeType(mimeType);
      const savedFile = await this.save(fileContent, basename(originalPath), fileUUID, type, adjustedPath);
      storagePath = savedFile.path;
    }
  
    const mimeType = await this.getMimeType(storagePath);
    const type = this.getFileCategoryFromMimeType(mimeType);
  
    const baseMetadata = generateMetadata({
      source: originalPath,
      name: basename(originalPath),
      mimeType,
      conversation_uuid,
    });
  
    let docs: IDoc[] = [];
  
    const processContent = async (content: string, additionalMetadata: Record<string, any> = {}) => {
      const metadata = { ...baseMetadata, ...additionalMetadata };
      if (chunkSize) {
        const chunks = await this.textService.split(content, chunkSize, metadata);
        return chunks.map((chunk, index) => ({
          ...chunk,
          metadata: {
            ...chunk.metadata,
            uuid: uuidv4(),
            chunk_index: index,
            total_chunks: chunks.length,
          },
        }));
      } else {
        return [await this.textService.document(content, undefined, { ...metadata, uuid: uuidv4() })];
      }
    };
  
    switch (type) {
      case 'audio':
        const absoluteStoragePath = path.join(this.STORAGE_DIR, storagePath);
        const chunks = await this.audioService.split(absoluteStoragePath, 25);
        const transcriptions = await this.openAIService.transcribe(chunks, { language: 'pl', fileName: basename(originalPath, extname(originalPath)) + '.md' });
        
        docs = (await Promise.all(transcriptions.map(async (transcription, index) => 
          processContent(transcription.text, { ...transcription.metadata, chunk_index: index, total_chunks: transcriptions.length })
        ))).flat();
  
        await Promise.all(chunks.map(fs.unlink));
        break;
  
      case 'text':
        const textContent = await fs.readFile(path.join(this.STORAGE_DIR, storagePath), 'utf-8');
        docs = await processContent(textContent);
        break;
  
      case 'document':
        const docContent = await this.readDocumentFile(originalPath, storagePath);
        docs = await processContent(docContent.text);
        const screenshotPaths = await this.takeScreenshot(storagePath, basename(originalPath));
        docs.forEach(doc => {
          doc.metadata.screenshots = screenshotPaths;
        });
        break;
  
      case 'image':
        const imageDescriptions = await this.openAIService.processImages([storagePath]);
        docs = await processContent(imageDescriptions[0].description);
        break;
  
      default:
        throw new Error(`Unsupported file type: ${type}`);
    }
  
    return { docs };
  }

  /**
   * Loads file contents from a local storage path.
   * @param localPath - The local path to the file in storage.
   * @returns An object containing file data and metadata for sending to the client.
   */
  async load(filePath: string): Promise<{ data: Buffer; mimeType: string }> {
    try {
      const absolutePath = path.join(this.STORAGE_DIR, filePath);
      const data = await fs.readFile(absolutePath);
      const mimeType = await this.getMimeTypeFromBuffer(data, path.basename(filePath));
      return { data, mimeType };
    } catch (error) {
      console.error('Failed to load file:', error);
      throw error;
    }
  }

  async saveDocsToFile(docs: IDoc[], fileName: string): Promise<string> {
    const textService = new TextService();
    let fullContent = '';

    for (const doc of docs) {
      const restoredDoc = textService.restorePlaceholders(doc);
      fullContent += restoredDoc.text + '\n\n';
    }

    const fileUUID = uuidv4();
    const fileContent = Buffer.from(fullContent, 'utf-8');
    const savedFile = await this.save(fileContent, fileName, fileUUID, 'text');

    return savedFile.path;
  }
}
