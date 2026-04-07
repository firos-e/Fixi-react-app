const readEnv = (name) => {
  const value = process.env[name];

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
};

const requireEnv = (name) => {
  const value = readEnv(name);

  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
};

module.exports = {
  readEnv,
  requireEnv
};
