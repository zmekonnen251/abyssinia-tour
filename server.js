import mongoose from 'mongoose';
import dotenv from 'dotenv';
import {
  unHandledRejection,
  unCaughtException,
} from './controllers/errorController.js';
dotenv.config();

unCaughtException();

import app from './app.js';

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
    console.log('DB connection successful!');
  });

const port = process.env.PORT || 3000;

const server = app.listen(port, () =>
  console.log(`App listening on port ${port}!`)
);

unHandledRejection(server);
