import jwt from 'jsonwebtoken';

export default (type, user) => {
  if (type === 'refresh') {
    const payload = {
      id: user._id,
      email: user.email,
    }
    return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
      expiresIn: process.env.REFRESH_TOKEN_LIFE,
    });
  }

  if (type === 'access') {
    const payload = {
      _id: user._id,
      name: user.name,
      email: user.email,
      photo: user.photo,
      role: user.role,
    }
    return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: process.env.ACCESS_TOKEN_LIFE,
    });
  }

  return null;
};
