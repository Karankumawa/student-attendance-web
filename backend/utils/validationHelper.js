const mongoose = require('mongoose');

/**
 * Validate whether a string is a valid MongoDB ObjectId.
 */
const isValidObjectId = (id) => {
  return Boolean(id && mongoose.Types.ObjectId.isValid(id));
};

module.exports = {
  isValidObjectId,
};
