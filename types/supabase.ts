import { Database as DatabaseTypes } from '../src/types/database';

export type Database = DatabaseTypes;

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];
