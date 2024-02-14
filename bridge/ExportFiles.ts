import {NativeModules} from 'react-native';
interface IExportFiles {
  exportTextFile(filename: string, text: string): void;
  readTextFile(): Promise<{text: string; filename: string}>;
  exportBackups(chanBackup: string): void;
  readSubmarineBackup(): Promise<string>;
  createSubmarineDbFile(dbBase64: string): Promise<void>;
}
const {ExportFiles: _ExportFiles} = NativeModules;

const ExportFiles = _ExportFiles as IExportFiles;
export default ExportFiles as IExportFiles;
