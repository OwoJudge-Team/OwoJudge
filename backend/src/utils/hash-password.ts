import crypto, { scryptSync, randomBytes } from 'crypto';
import FileSystem from 'fs';

export const randomString = (size: number): string => {
  return randomBytes(size).toString('hex');
};

let salt: string | undefined;

const readSalt = (): void => {
  try {
    const SALT: string = JSON.parse(FileSystem.readFileSync('./salt.json', 'utf-8')).salt;
    salt = SALT;
    console.log(SALT);
  } catch (error) {
    salt = crypto.randomBytes(32).toString('hex');
    FileSystem.writeFileSync('./salt.json', JSON.stringify({ salt }, null, 4));
  }
};

export const hashString = (str: string): string => {
  if (!salt) {
    readSalt();
  }
  return scryptSync(str, salt as string, 32).toString('hex');
};

export const stringMatch = (str: string, hashedStr: string): boolean => {
  return hashString(str) === hashedStr;
};
