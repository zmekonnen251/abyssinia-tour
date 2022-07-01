import mongoose from 'mongoose';
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
    console.log('DB is connected');
  });

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`App listening on port ${port}!`));
