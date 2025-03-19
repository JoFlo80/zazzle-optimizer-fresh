exports.handler = async () => {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Netlify test function is working!" })
  };
};