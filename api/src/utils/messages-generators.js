module.exports = {
  genMinLenErrMsg: (prefix, min, suffix) => {
    return `${prefix} must have at least ${min} ${suffix || 'characters'}`;
  },

  genMaxLenErrMsg: (prefix, max, suffix) => {
    return `${prefix} cannot have more than ${max} ${suffix || 'characters'}`;
  },
};
