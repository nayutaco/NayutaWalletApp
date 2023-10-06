import {Buffer} from 'buffer';

import ExportFiles from './ExportFiles';

export async function readTextFile(): Promise<{text: string; filename: string}> {
  return await ExportFiles.readTextFile();
}

export function exportBackups(chanBackup: string) {
  ExportFiles.exportBackups(chanBackup);
}

export async function readSubmarineBackup(): Promise<string> {
  return await ExportFiles.readSubmarineBackup();
}

export async function createSubmarineDbFile(data: Uint8Array) {
  await ExportFiles.createSubmarineDbFile(Buffer.from(data).toString('base64'));
}

export async function exportTextFile(filename: string, text: string) {
  await ExportFiles.exportTextFile(filename, text);
}
