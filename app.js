import express from 'express';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
// import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import hpp from 'hpp';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';

import corsOptions from './config/corsOptions.js';

import tourRouter from './routes/tourRoutes.js';
import userRouter from './routes/userRoutes.js';
import reviewRouter from './routes/reviewRoutes.js';
import bookingRouter from './routes/bookingRoutes.js';

import { webhookCheckout } from './controllers/bookingController.js';
// import { createBookingCheckout } from './controllers/bookingController.js';

import AppError from './utils/appError.js';

import globalErrorHandler, {
  unCaughtException,
} from './controllers/errorController.js';

import path from 'path';
import { fileURLToPath } from 'url';

import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

unCaughtException();
// const allowedOrigins = [

// ];

// const corsOptions = {
//   origin: [
//     'http://localhost:3000',
//     'http://localhost:3001',
//     undefined,
//   ],
//   credentials: true,

//   optionOnSuccess: (res) => {
//     res.header('Access-Control-Allow-Origin', '*');
//     res.header(
//       'Access-Control-Allow-Headers',
//       'Content-Type, Authorization'
//     );
//     res.header(
//       'Access-Control-Allow-Methods',
//       'GET, POST, PUT, DELETE'
//     );
//     res.header('Access-Control-Allow-Credentials', true);
//     res.header('Access-Control-Max-Age', 86400);
//     res.status(201).send();
//   },
// };

const app = express();

// Sentry.init({
//   dsn: 'https://5ccaa63c517a4f9eb3bd8744795b0047@o4504181861580800.ingest.sentry.io/4504826356301824',
//   integrations: [
//     // enable HTTP calls tracing
//     new Sentry.Integrations.Http({ tracing: true }),
//     // enable Express.js middleware tracing
//     new Tracing.Integrations.Express({ app }),
//   ],

//   // Set tracesSampleRate to 1.0 to capture 100%
//   // of transactions for performance monitoring.
//   // We recommend adjusting this value in production
//   tracesSampleRate: 1.0,
// });

// RequestHandler creates a separate execution context using domains, so that every
// // transaction/span/breadcrumb is attached to its own Hub instance
// app.use(Sentry.Handlers.requestHandler());
// // TracingHandler creates a trace for every incoming request
// app.use(Sentry.Handlers.tracingHandler());

// app.enable('trust proxy');
// 1) GLOBAL MIDDLEWARES

app.use(cors(corsOptions));
app.options('*', cors());

// serving static files
app.use(express.static(path.join(__dirname, 'public')));

// Set security HTTP headers
// app.use(helmet());

// Development logging
// if (process.env.NODE_ENV === 'development') {
app.use(morgan('dev'));
// }

// Limit requests from same API
// const limiter = rateLimit({
//   max: 100,
//   windowMs: 60 * 60 * 1000,
//   message:
//     'Too many requests from this IP, please try again in an hour!',
// });

// app.use('/api', limiter);
// app.use(express.raw({ type: 'application/json' }));

app.post(
  '/webhook-checkout',
  express.raw({ type: 'application/json' }),
  webhookCheckout
);

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  })
);

app.use(compression());

// Test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

// 3) ROUTES
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

// app.use(
//   Sentry.Handlers.errorHandler({
//     shouldHandleError(error) {
//       // Capture all 404 and 500 errors
//       if (error.status === 404 || error.status === 500) {
//         return true;
//       }
//       return false;
//     },
//   })
// );

// Optional fallthrough error handler
// app.use(function onError(err, req, res, next) {
//   // The error id is attached to `res.sentry` to be returned
//   // and optionally displayed to the user for support.
//   res.statusCode = 500;
//   res.end(res.sentry + '\n');
// });

//4) Unhandled routes
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`));
});

//5) Global error handler
app.use(globalErrorHandler);

export default app;
