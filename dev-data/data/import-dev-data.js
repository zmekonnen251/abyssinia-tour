import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Tour from './../../models/tourModel.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: './config.env' });

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('DB Connected');
  });

// Read JSON files
const tours = JSON.parse(
  fs.readFileSync(`${__dirname}/tours-simple.json`, 'utf-8')
);

// Import data into DB
const importData = async () => {
  try {
    await Tour.create(tours);
    console.log('Data Imported');
  } catch {
    console.log('Data Import Failed');
  }
  process.exit();
};

// Delete all data from DB
const deleteData = async () => {
  try {
    await Tour.deleteMany();
    console.log('Data Deleted');
  } catch (err) {
    console.log(err);
  }
  process.exit();
};

if (process.argv[2] === '--import') {
  importData();
} else if (process.argv[2] === '--delete') {
  deleteData();
} else {
  console.log('Please provide a valid command');
}

console.log(process.argv);
