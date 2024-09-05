import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  tour: {
    type: mongoose.Schema.ObjectId,
    ref: 'Tour',
    required: [true, 'Booking must belong to a tour.'],
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Booking must belong to a user.'],
  },

  price: {
    type: Number,
    required: [true, 'Booking must have a price.'],
  },

  createdAt: {
    type: Date,
    default: mongoose.Types.ObjectId().getTimestamp(),
  },

  modifiedAt: {
    type: Date,
    default: mongoose.Types.ObjectId().getTimestamp(),
  },

  paid: {
    type: Boolean,
    default: false,
  },
});

bookingSchema.pre(/^find/, function (next) {
  this.populate('user').populate({
    path: 'tour',
    select: 'name',
  });

  next();

  // this points to the current query
});

const Booking = mongoose.model('Booking', bookingSchema);

export default Booking;
