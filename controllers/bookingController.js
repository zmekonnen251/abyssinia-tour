import Tour from '../models/tourModel.js';
import catchAsync from '../utils/catchAsync.js';
import factory from './handlerFactory.js';
import AppError from '../utils/appError.js';
import Stripe from 'stripe';
import Booking from '../models/bookingModel.js';
import User from '../models/userModel.js';

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

export const getCheckoutSession = catchAsync(
  async (req, res, next) => {
    // 1) Get the currently booked tour
    const tour = await Tour.findById(req.params.tourId);

    if (!tour) {
      return next(new AppError('There is no tour with that ID', 404));
    }

    // 2) Create checkout session

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      success_url: `${req.get('origin')}/profile/my-bookings`,
      cancel_url: `${req.get('origin')}/tours/${req.params.tourId}`,
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
                `https://abyssinia-tour.onrender.com/img/tours/${tour.imageCover}`,
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

const createBookingCheckout = async (session) => {
  const tour = session.client_reference_id;
  const user = await User.findOne({ email: session.customer_email });
  const price = session.amount_total / 100;

  await Booking.create({ tour, user, price });
};

export const webhookCheckout = catchAsync(async (req, res, next) => {
  const signature = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    await createBookingCheckout(session);
  }

  res.status(200).json({ received: true });
});

export const getAllBookings = factory.getAll(Booking);
export const deleteBooking = factory.deleteOne(Booking);
export const getBooking = factory.getOne(Booking);
export const updateBooking = factory.updateOne(Booking);
