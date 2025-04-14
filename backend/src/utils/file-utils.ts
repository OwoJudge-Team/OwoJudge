import { Buffer } from 'buffer';

/**
 * Checks if a file buffer is a tar.gz file by examining magic numbers
 * @param file The file buffer to check
 * @returns boolean indicating if the file is a tar.gz file
 */
export const isTarGz = (file: Buffer): boolean => {
  // Check for gzip magic numbers (0x1F 0x8B 0x08)
  return file.length > 3 &&
    file[0] === 0x1F &&
    file[1] === 0x8B &&
    file[2] === 0x08;
};