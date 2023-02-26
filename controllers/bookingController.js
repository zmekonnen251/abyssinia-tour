import Tour from '../models/tourModel.js';
import catchAsync from '../utils/catchAsync.js';
import factory from './handlerFactory.js';
import AppError from '../utils/appError.js';
import Stripe from 'stripe';
import Booking from '../models/bookingModel.js';

export const getCheckoutSession = catchAsync(
  async (req, res, next) => {
    // 1) Get the currently booked tour
    const tour = await Tour.findById(req.params.tourId);

    if (!tour) {
      return next(new AppError('There is no tour with that ID', 404));
    }

    // 2) Create checkout session
    const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      success_url: `http://localhost:3000/tours/${req.params.tourId}/?tour=${req.params.tourId}&user=${req.user.id}&price=${tour.price}&success=true`,
      // success_url: `http://localhost:3000/tours?success=true`,

      cancel_url: `http://localhost:3000/tours?canceled=true`,
      customer_email: req.user.email,
      client_reference_id: req.params.tourId,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${tour.name} Tour`,
              description: tour.summary,
              images: [
                `https://www.natours.dev/img/tours/${tour.imageCover}`,
              ],
            },
            unit_amount: tour.price * 100,
          },
          quantity: 1,
        },
      ],
    });
    // 3) Create session as response
    res.status(200).json({
      status: 'success',
      session,
    });
  }
);

export const createBookingCheckout = catchAsync(
  async (req, res, next) => {
    const { tour, user, price } = req.params;

    if (!tour && !user && !price) return next();

    const updatedPrice = parseFloat(price);

    await Booking.create({ tour, user, price: updatedPrice });

    res.status(201).json({
      status: 'success',
      data: null,
    });
  }
);

export const getUserBookings = catchAsync(async (req, res, next) => {
  const bookings = await Booking.find({ user: req.user._id });

  res.status(200).json({
    status: 'success',
    results: bookings.length,
    data: {
      bookings,
    },
  });
});

export const getAllBookings = factory.getAll(Booking);
export const deleteBooking = factory.deleteOne(Booking);
export const createBooking = factory.createOne(Booking);
export const getBooking = factory.getOne(Booking);
export const updateBooking = factory.updateOne(Booking);
